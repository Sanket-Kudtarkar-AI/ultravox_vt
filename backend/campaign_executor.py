import logging
import time
import threading
import json
import traceback
import requests
from datetime import datetime
from sqlalchemy import and_
from models import Campaign, CampaignContact, Agent, CallLog
from database import get_db_session, close_db_session, get_db_session_with_retry
from config import setup_logging, NGROK_URL

# Set up logging
logger = setup_logging("campaign_executor", "campaign_executor.log")

# Global flags and configuration
running = False
executor_thread = None
MAX_CONCURRENT_CALLS = 1  # Process only one call at a time
POLL_INTERVAL = 10  # How often to check for campaigns to process (seconds)
CALL_INTERVAL = 5  # Wait 5 seconds between calls
CAMPAIGN_PROCESSING_LIMIT = 3  # Maximum number of campaigns to process at once
API_BASE_URL = "http://localhost:5000/api"  # Base URL for API calls


def make_call(contact, campaign, agent):
    """Make a call to a contact for a campaign"""
    try:
        # Prepare call data
        call_data = {
            "recipient_phone_number": contact.phone,
            "plivo_phone_number": campaign.from_number,
            "agent_id": campaign.assigned_agent_id,
            "campaign_id": campaign.campaign_id
        }

        # Use agent's system prompt if available
        if agent and agent.system_prompt:
            call_data["system_prompt"] = agent.system_prompt

        # Add any additional data from campaign config
        if campaign.config:
            try:
                config_data = json.loads(campaign.config)
                if "call_settings" in config_data:
                    call_data.update(config_data["call_settings"])
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in campaign config for campaign {campaign.campaign_id}")

        # Update contact status to "calling"
        db_session = get_db_session_with_retry()
        contact.status = "calling"
        db_session.commit()
        close_db_session(db_session)

        # Make the actual call
        logger.info(f"Making campaign call to {contact.phone} for campaign {campaign.campaign_id}")
        response = requests.post(f"{API_BASE_URL}/make_call", json=call_data)

        # Process response
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "success":
                # Store the call UUID for tracking
                db_session = get_db_session_with_retry()
                contact = db_session.query(CampaignContact).get(contact.id)
                contact.call_uuid = result.get("call_uuid")
                contact.additional_data = json.dumps({
                    "call_initiated_at": datetime.now().isoformat(),
                    "call_data": result
                })
                db_session.commit()
                close_db_session(db_session)

                logger.info(f"Call initiated successfully to {contact.phone}, UUID: {result.get('call_uuid')}")
                return True
            else:
                logger.error(f"Call API returned error: {result.get('message')}")

                # Update contact status to "failed"
                db_session = get_db_session_with_retry()
                contact = db_session.query(CampaignContact).get(contact.id)
                contact.status = "failed"
                contact.additional_data = json.dumps({
                    "error": result.get("message"),
                    "error_time": datetime.now().isoformat()
                })
                db_session.commit()
                close_db_session(db_session)

                return False
        else:
            logger.error(f"Call API returned status code {response.status_code}: {response.text}")

            # Update contact status to "failed"
            db_session = get_db_session_with_retry()
            contact = db_session.query(CampaignContact).get(contact.id)
            contact.status = "failed"
            contact.additional_data = json.dumps({
                "error": f"API error: {response.status_code}",
                "error_time": datetime.now().isoformat()
            })
            db_session.commit()
            close_db_session(db_session)

            return False

    except Exception as e:
        logger.error(f"Error making call to {contact.phone}: {str(e)}")
        logger.error(traceback.format_exc())

        # Update contact status to "failed"
        try:
            db_session = get_db_session_with_retry()
            contact = db_session.query(CampaignContact).get(contact.id)
            contact.status = "failed"
            contact.additional_data = json.dumps({
                "error": str(e),
                "error_time": datetime.now().isoformat()
            })
            db_session.commit()
            close_db_session(db_session)
        except Exception as db_err:
            logger.error(f"Database error updating contact status: {str(db_err)}")

        return False


def process_campaign(campaign_id):
    """Process a single campaign"""
    logger.info(f"Processing campaign: {campaign_id}")
    db_session = None
    try:
        db_session = get_db_session_with_retry()

        # Get campaign
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            logger.error(f"Campaign {campaign_id} not found")
            return False

        # Verify campaign is running
        if campaign.status != "running":
            logger.info(f"Campaign {campaign_id} is not running (status: {campaign.status})")
            return False

        # Get the agent for this campaign
        agent = db_session.query(Agent).filter_by(agent_id=campaign.assigned_agent_id).first()
        if not agent:
            logger.warning(f"Agent {campaign.assigned_agent_id} not found for campaign {campaign_id}")

        # Get ONE pending contact for this campaign
        pending_contact = db_session.query(CampaignContact).filter(
            and_(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "pending"
            )
        ).first()

        # Count currently active calls for this campaign
        active_calls = db_session.query(CampaignContact).filter(
            and_(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "calling"
            )
        ).count()

        # Close session before making calls
        close_db_session(db_session)
        db_session = None

        if not pending_contact:
            # Check if all contacts are completed or failed
            db_session = get_db_session_with_retry()
            total_contacts = db_session.query(CampaignContact).filter_by(campaign_id=campaign_id).count()
            completed_contacts = db_session.query(CampaignContact).filter(
                and_(
                    CampaignContact.campaign_id == campaign_id,
                    CampaignContact.status.in_(["completed", "failed", "no-answer"])
                )
            ).count()

            if total_contacts > 0 and total_contacts == completed_contacts:
                # All contacts processed - mark campaign as completed
                campaign.status = "completed"
                campaign.updated_at = datetime.now()
                db_session.commit()
                logger.info(f"Campaign {campaign_id} completed - all contacts processed")
                close_db_session(db_session)
                return True

            close_db_session(db_session)
            logger.info(f"No pending contacts found for campaign {campaign_id}")
            return False

        # Only make a call if there are no active calls
        if active_calls == 0:
            # Make a single call
            success = make_call(pending_contact, campaign, agent)
            if success:
                logger.info(f"Made call to contact {pending_contact.id} for campaign {campaign_id}")
                return True
        else:
            logger.info(f"Campaign {campaign_id} already has an active call, waiting...")

        return False

    except Exception as e:
        logger.error(f"Error processing campaign {campaign_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return False
    finally:
        if db_session:
            close_db_session(db_session)


def execute_campaigns():
    """Main loop that processes all running campaigns"""
    global running

    logger.info("Campaign executor thread started")

    while running:
        try:
            # Get campaigns that are running
            db_session = get_db_session_with_retry()
            running_campaigns = db_session.query(Campaign).filter_by(status="running").all()
            campaign_ids = [c.campaign_id for c in running_campaigns]
            close_db_session(db_session)

            if not campaign_ids:
                logger.info("No running campaigns found, sleeping...")
                time.sleep(POLL_INTERVAL)
                continue

            logger.info(f"Found {len(campaign_ids)} running campaigns: {campaign_ids}")

            # Process each campaign (limited by CAMPAIGN_PROCESSING_LIMIT)
            for campaign_id in campaign_ids[:CAMPAIGN_PROCESSING_LIMIT]:
                process_campaign(campaign_id)

                # Wait between processing campaigns
                time.sleep(CALL_INTERVAL)

            # Check for scheduled campaigns that should be started
            db_session = get_db_session_with_retry()
            now = datetime.now()
            scheduled_campaigns = db_session.query(Campaign).filter(
                and_(
                    Campaign.status == "scheduled",
                    Campaign.schedule_date <= now
                )
            ).all()

            for campaign in scheduled_campaigns:
                logger.info(f"Starting scheduled campaign {campaign.campaign_id}")
                campaign.status = "running"
                campaign.updated_at = now

            db_session.commit()
            close_db_session(db_session)

            # Wait before next polling cycle
            time.sleep(POLL_INTERVAL)

        except Exception as e:
            logger.error(f"Error in campaign executor: {str(e)}")
            logger.error(traceback.format_exc())
            time.sleep(POLL_INTERVAL)


def update_call_statuses():
    """Periodically check and update the status of active calls"""
    while running:
        try:
            db_session = get_db_session_with_retry()

            # Get contacts that are in 'calling' status and have a call_uuid
            active_calls = db_session.query(CampaignContact).filter(
                and_(
                    CampaignContact.status == "calling",
                    CampaignContact.call_uuid.isnot(None)
                )
            ).all()

            if not active_calls:
                close_db_session(db_session)
                time.sleep(POLL_INTERVAL)
                continue

            logger.info(f"Checking status for {len(active_calls)} active calls")

            for contact in active_calls:
                try:
                    # Get call status from API
                    response = requests.get(f"{API_BASE_URL}/call_status/{contact.call_uuid}")

                    if response.status_code == 200:
                        result = response.json()

                        call_status = None
                        additional_data = {}

                        # Get existing additional data
                        try:
                            additional_data = json.loads(contact.additional_data) if contact.additional_data else {}
                        except json.JSONDecodeError:
                            additional_data = {}

                        # Check if the call is completed
                        if result.get("status") == "success":
                            if result.get("call"):
                                # For completed calls
                                call_details = result.get("call")
                                call_state = call_details.get("call_state")

                                # Map call_state to contact status
                                if call_state == "ANSWER":
                                    call_status = "completed"
                                elif call_state in ["NO_ANSWER", "BUSY", "TIMEOUT"]:
                                    call_status = "no-answer"
                                elif call_state == "FAILED" or call_state == "EARLY MEDIA":
                                    call_status = "failed"

                                # Store call details in contact's additional_data
                                additional_data["call_details"] = call_details
                                if call_details.get("call_duration"):
                                    additional_data["duration"] = call_details.get("call_duration")

                            elif result.get("call_status"):
                                # For live calls
                                live_status = result.get("call_status")

                                # Only update if call is completed
                                if live_status == "completed":
                                    call_status = "completed"
                                elif live_status == "no-answer" or live_status == "busy":
                                    call_status = "no-answer"
                                elif live_status == "failed":
                                    call_status = "failed"

                                # Store the status in additional_data
                                additional_data["live_status"] = live_status

                        # Also check call_logs table directly to get the most up-to-date status
                        call_log = db_session.query(CallLog).filter_by(call_uuid=contact.call_uuid).first()
                        if call_log:
                            additional_data["call_log_state"] = call_log.call_state
                            additional_data["call_log_hangup_cause"] = call_log.hangup_cause

                            # If call_log has a final status but we haven't set a status yet
                            if call_log.call_state and not call_status:
                                if call_log.call_state == "ANSWER":
                                    call_status = "completed"
                                elif call_log.call_state in ["NO_ANSWER", "BUSY", "TIMEOUT"]:
                                    call_status = "no-answer"
                                elif call_log.call_state in ["FAILED", "EARLY MEDIA"]:
                                    call_status = "failed"

                            # Also check hangup cause
                            if call_log.hangup_cause and not call_status:
                                if call_log.hangup_cause == "NORMAL_CLEARING":
                                    call_status = "completed"
                                elif call_log.hangup_cause in ["NO_ANSWER", "NO_USER_RESPONSE", "USER_BUSY"]:
                                    call_status = "no-answer"
                                elif call_log.hangup_cause:  # Any other hangup cause
                                    call_status = "failed"

                        # Update the contact if we have a final status
                        if call_status:
                            logger.info(f"Updating contact {contact.id} status from 'calling' to '{call_status}'")
                            contact.status = call_status

                        # Always update additional_data
                        contact.additional_data = json.dumps(additional_data)

                except Exception as call_err:
                    logger.error(f"Error checking call status for contact {contact.id}: {str(call_err)}")

            db_session.commit()
            close_db_session(db_session)

            # Wait before next update cycle
            time.sleep(POLL_INTERVAL)

        except Exception as e:
            logger.error(f"Error updating call statuses: {str(e)}")
            logger.error(traceback.format_exc())

            try:
                close_db_session(db_session)
            except:
                pass

            time.sleep(POLL_INTERVAL)


def start_executor():
    """Start the campaign executor thread"""
    global running, executor_thread

    if running:
        logger.warning("Campaign executor already running")
        return False

    running = True

    # Start the main executor thread
    executor_thread = threading.Thread(target=execute_campaigns)
    executor_thread.daemon = True
    executor_thread.start()

    # Start the call status update thread
    status_thread = threading.Thread(target=update_call_statuses)
    status_thread.daemon = True
    status_thread.start()

    logger.info("Campaign executor started")
    return True


def stop_executor():
    """Stop the campaign executor thread"""
    global running, executor_thread

    if not running:
        logger.warning("Campaign executor already stopped")
        return False

    running = False

    if executor_thread:
        executor_thread.join(timeout=5.0)
        executor_thread = None

    logger.info("Campaign executor stopped")
    return True


# Initialize the executor
def initialize():
    """Initialize the campaign executor on startup"""
    try:
        # Check for campaigns that were running when the server stopped
        db_session = get_db_session_with_retry()
        running_campaigns = db_session.query(Campaign).filter_by(status="running").all()

        if running_campaigns:
            logger.info(f"Found {len(running_campaigns)} campaigns in 'running' state at startup")

            # Auto-start the executor if there are running campaigns
            start_executor()

        close_db_session(db_session)

    except Exception as e:
        logger.error(f"Error initializing campaign executor: {str(e)}")
        logger.error(traceback.format_exc())