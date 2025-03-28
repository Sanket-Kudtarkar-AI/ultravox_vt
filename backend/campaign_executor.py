import logging
import time
import threading
import json
import traceback
import requests
from datetime import datetime
from sqlalchemy import and_, func
from models import Campaign, CampaignContact, Agent, CallLog, CallAnalytics, CallAnalysisStatus
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
        # Verify parameters are valid
        if not contact or not contact.phone:
            logger.error(f"Invalid contact: missing phone number")
            return False

        if not campaign or not campaign.from_number:
            logger.error(f"Invalid campaign: missing from number")
            return False

        # Store contact ID for logging (to avoid detached instance issues)
        contact_id = contact.id
        contact_phone = contact.phone

        # Prepare call data
        call_data = {
            "recipient_phone_number": contact.phone,
            "plivo_phone_number": campaign.from_number,
            "agent_id": campaign.assigned_agent_id,
            "campaign_id": campaign.campaign_id
        }

        # Log the call setup details
        logger.info(f"Setting up call for contact {contact_id}:")
        logger.info(f"  - To: {contact_phone}")
        logger.info(f"  - From: {campaign.from_number}")
        logger.info(f"  - Agent: {campaign.assigned_agent_id}")
        logger.info(f"  - Campaign: {campaign.campaign_id}")

        # Use agent's system prompt if available
        if agent and agent.system_prompt:
            call_data["system_prompt"] = agent.system_prompt
            logger.info(f"  - Using custom system prompt from agent")

        # Add any additional data from campaign config
        if campaign.config:
            try:
                config_data = json.loads(campaign.config)
                if "call_settings" in config_data:
                    logger.info(f"  - Applying custom call settings from campaign config")
                    call_data.update(config_data["call_settings"])
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in campaign config for campaign {campaign.campaign_id}")

        # Contact should already be marked as "calling" from process_campaign
        # We don't need to update it here

        # Make the actual call
        logger.info(f"Sending make_call API request to {API_BASE_URL}/make_call")

        # Verify the API_BASE_URL is properly configured
        if not API_BASE_URL:
            logger.error("API_BASE_URL is not configured properly")
            return False

        # Make the API call with a timeout
        try:
            response = requests.post(
                f"{API_BASE_URL}/make_call",
                json=call_data,
                timeout=30  # Add a 30 second timeout
            )
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Request error making call: {str(req_err)}")

            # Update contact status back to "pending" so it can be retried
            db_session = get_db_session_with_retry()
            contact = db_session.query(CampaignContact).filter_by(id=contact_id).first()
            if contact:
                contact.status = "pending"
                contact.additional_data = json.dumps({
                    "error": f"API request error: {str(req_err)}",
                    "error_time": datetime.now().isoformat()
                })
                db_session.commit()
            close_db_session(db_session)
            return False

        # Log the raw response for debugging
        logger.info(f"Make call API response status: {response.status_code}")
        logger.info(f"Make call API response body: {response.text[:1000]}")  # Log first 1000 chars

        # Process response
        if response.status_code == 200:
            try:
                result = response.json()
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON response: {response.text[:100]}")
                return False

            if result.get("status") == "success":
                # Store the call UUID for tracking in a new session
                db_session = get_db_session_with_retry()
                contact = db_session.query(CampaignContact).filter_by(id=contact_id).first()
                if not contact:
                    logger.error(f"Contact {contact_id} not found in database after call")
                    close_db_session(db_session)
                    return False

                contact.call_uuid = result.get("call_uuid")
                # Make sure to properly serialize the JSON
                additional_data = {
                    "call_initiated_at": datetime.now().isoformat(),
                    "call_data": result
                }
                contact.additional_data = json.dumps(additional_data)
                db_session.commit()
                close_db_session(db_session)

                logger.info(f"Call initiated successfully to {contact_phone}, UUID: {result.get('call_uuid')}")
                return True
            else:
                logger.error(f"Call API returned error: {result.get('message')}")

                # Update contact status to "failed"
                db_session = get_db_session_with_retry()
                contact = db_session.query(CampaignContact).filter_by(id=contact_id).first()
                if contact:
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
            contact = db_session.query(CampaignContact).filter_by(id=contact_id).first()
            if contact:
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
            contact = db_session.query(CampaignContact).filter_by(id=contact_id).first()
            if contact:
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
            close_db_session(db_session)
            return False

        # Verify campaign is running
        if campaign.status != "running":
            logger.info(f"Campaign {campaign_id} is not running (status: {campaign.status})")
            close_db_session(db_session)
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

        if not pending_contact:
            logger.info(f"No pending contacts found for campaign {campaign_id}")

            # Check if all contacts are completed or failed
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
                campaign.progress = 100  # Ensure progress is 100%
                campaign.updated_at = datetime.now()
                db_session.commit()

                # Also update analysis progress
                update_campaign_analysis_progress(campaign_id, db_session)

                logger.info(f"Campaign {campaign_id} completed - all contacts processed")
                close_db_session(db_session)
                return True

            # Update campaign progress before returning
            update_campaign_progress(campaign_id, db_session)
            close_db_session(db_session)
            return False

        logger.info(f"Found pending contact {pending_contact.id} for campaign {campaign_id}")

        # Count currently active calls for this campaign
        active_calls = db_session.query(CampaignContact).filter(
            and_(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "calling"
            )
        ).count()

        logger.info(f"Campaign {campaign_id} has {active_calls} active calls")

        # Update campaign progress
        update_campaign_progress(campaign_id, db_session)

        # Only make a call if there are no active calls
        if active_calls == 0:
            # Keep the pending_contact ID and other essential data we'll need after closing the session
            contact_id = pending_contact.id
            contact_phone = pending_contact.phone
            contact_name = pending_contact.name

            # Set contact status to calling before closing session
            pending_contact.status = "calling"
            db_session.commit()

            # Now close the session
            close_db_session(db_session)
            db_session = None

            # Make a single call with just the essential data we need
            logger.info(f"Attempting to make call for contact {contact_id} (campaign {campaign_id})")

            # Get fresh copies of objects with a new session
            new_db_session = get_db_session_with_retry()
            campaign_fresh = new_db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
            agent_fresh = new_db_session.query(Agent).filter_by(agent_id=campaign_fresh.assigned_agent_id).first()
            contact_fresh = new_db_session.query(CampaignContact).filter_by(id=contact_id).first()

            # Make sure we got all the objects
            if not campaign_fresh or not contact_fresh:
                logger.error(f"Could not reload campaign or contact from database")
                close_db_session(new_db_session)
                return False

            # Make the call with fresh objects
            success = make_call(contact_fresh, campaign_fresh, agent_fresh)

            # Close the new session
            close_db_session(new_db_session)

            if success:
                logger.info(f"Successfully made call to contact {contact_id} for campaign {campaign_id}")
                return True
            else:
                logger.error(f"Failed to make call to contact {contact_id} for campaign {campaign_id}")
                return False
        else:
            logger.info(f"Campaign {campaign_id} already has {active_calls} active call(s), waiting...")
            close_db_session(db_session)
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
                # Add detailed logging to diagnose campaign execution issues
                logger.info(f"Starting to process campaign {campaign_id} for execution")

                # Immediately check if there are pending contacts for this campaign
                db_session = get_db_session_with_retry()
                pending_contact_count = db_session.query(func.count(CampaignContact.id)).filter(
                    and_(
                        CampaignContact.campaign_id == campaign_id,
                        CampaignContact.status == "pending"
                    )
                ).scalar()

                active_calls_count = db_session.query(func.count(CampaignContact.id)).filter(
                    and_(
                        CampaignContact.campaign_id == campaign_id,
                        CampaignContact.status == "calling"
                    )
                ).scalar()
                close_db_session(db_session)

                logger.info(
                    f"Campaign {campaign_id} has {pending_contact_count} pending contacts and {active_calls_count} active calls")

                if pending_contact_count > 0 and active_calls_count == 0:
                    # Process the campaign if there are pending contacts and no active calls
                    result = process_campaign(campaign_id)
                    logger.info(f"Processed campaign {campaign_id}, result: {result}")

                    # If processing was successful, wait a bit before the next call
                    if result:
                        time.sleep(CALL_INTERVAL)
                else:
                    if pending_contact_count == 0:
                        logger.info(f"Campaign {campaign_id} has no pending contacts to process")
                    if active_calls_count > 0:
                        logger.info(f"Campaign {campaign_id} already has active calls, skipping")

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

                            # If call has completed (either successfully or not), initiate analysis
                            if call_status in ["completed", "failed", "no-answer"] and call_log and call_log.ultravox_id:
                                # Trigger analysis in a non-blocking way
                                threading.Thread(
                                    target=check_and_initiate_analysis,
                                    args=(call_log.ultravox_id, contact.call_uuid, call_log.id)
                                ).start()

                        # Always update additional_data
                        contact.additional_data = json.dumps(additional_data)

                except Exception as call_err:
                    logger.error(f"Error checking call status for contact {contact.id}: {str(call_err)}")

            # Update progress for associated campaigns
            campaign_ids = set([contact.campaign_id for contact in active_calls if contact.campaign_id])
            for campaign_id in campaign_ids:
                update_campaign_progress(campaign_id, db_session)

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


def update_campaign_progress(campaign_id, db_session=None):
    """Update campaign progress based on contact statuses"""
    try:
        close_session = False
        if not db_session:
            db_session = get_db_session_with_retry()
            close_session = True

        # Get campaign
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            logger.warning(f"Campaign {campaign_id} not found when updating progress")
            return

        # Get counts
        total_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id).scalar() or 0

        if total_contacts == 0:
            return

        completed_contacts = db_session.query(func.count(CampaignContact.id)).filter(
            and_(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status.in_(["completed", "failed", "no-answer"])
            )
        ).scalar() or 0

        # Calculate progress percentage
        progress = int((completed_contacts / total_contacts) * 100) if total_contacts > 0 else 0

        # Update campaign progress
        campaign.progress = progress

        # If all contacts are processed, set campaign to completed
        if progress == 100 and campaign.status == "running":
            campaign.status = "completed"
            logger.info(f"Campaign {campaign_id} automatically marked as completed (progress 100%)")

        # Check and update analysis progress
        update_campaign_analysis_progress(campaign_id, db_session)

        db_session.commit()
        logger.info(f"Updated campaign {campaign_id} progress to {progress}%")

    except Exception as e:
        logger.error(f"Error updating campaign progress: {str(e)}")
        logger.error(traceback.format_exc())
    finally:
        if close_session and db_session:
            close_db_session(db_session)


def update_campaign_analysis_progress(campaign_id, db_session=None):
    """Update campaign analysis progress using stored analysis status"""
    try:
        close_session = False
        if not db_session:
            db_session = get_db_session_with_retry()
            close_session = True

        # Get campaign
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            logger.warning(f"Campaign {campaign_id} not found when updating analysis progress")
            return

        # Get all completed contacts with call UUIDs
        completed_contacts = db_session.query(CampaignContact).filter(
            and_(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "completed",
                CampaignContact.call_uuid.isnot(None)
            )
        ).all()

        if not completed_contacts:
            campaign.analysis_progress = 0
            if close_session:
                db_session.commit()
            return

        # Get all call UUIDs
        call_uuids = [contact.call_uuid for contact in completed_contacts]

        # Get calls with complete analysis from our CallAnalysisStatus table
        calls_with_analysis = db_session.query(func.count(CallAnalysisStatus.id)).filter(
            and_(
                CallAnalysisStatus.call_uuid.in_(call_uuids),
                CallAnalysisStatus.is_complete == True
            )
        ).scalar()

        # Calculate analysis progress
        analysis_progress = int((calls_with_analysis / len(completed_contacts)) * 100) if completed_contacts else 0

        # Update campaign analysis progress
        campaign.analysis_progress = analysis_progress

        if close_session:
            db_session.commit()

        logger.info(
            f"Updated campaign {campaign_id} analysis progress to {analysis_progress}% ({calls_with_analysis}/{len(completed_contacts)} calls analyzed)")

    except Exception as e:
        logger.error(f"Error updating campaign analysis progress: {str(e)}")
        logger.error(traceback.format_exc())
    finally:
        if close_session and db_session:
            close_db_session(db_session)


def check_and_initiate_analysis(ultravox_call_id, call_uuid, call_log_id=None):
    """Check if analysis is needed and start the analysis process"""
    try:
        logger.info(f"Starting analysis for call: {call_uuid} (VT ID: {ultravox_call_id})")

        # First check if we already have an analysis status record
        db_session = get_db_session_with_retry()
        analysis_status = db_session.query(CallAnalysisStatus).filter_by(call_uuid=call_uuid).first()

        # If no record exists, create one
        if not analysis_status:
            analysis_status = CallAnalysisStatus(
                call_uuid=call_uuid,
                ultravox_id=ultravox_call_id,
                has_transcript=False,
                has_recording=False,
                has_summary=False,
                is_complete=False
            )
            db_session.add(analysis_status)
            db_session.commit()
            logger.info(f"Created new analysis status record for call {call_uuid}")

        # If analysis is already complete, just return
        if analysis_status.is_complete:
            logger.info(f"Analysis already complete for call {call_uuid}, skipping checks")
            close_db_session(db_session)
            return

        # Update last_checked timestamp
        analysis_status.last_checked = datetime.now()
        db_session.commit()

        # Check call transcription if needed
        if not analysis_status.has_transcript:
            transcription_url = f"{API_BASE_URL}/call_transcription/{ultravox_call_id}"
            logger.info(f"Checking transcript for call {call_uuid} at {transcription_url}")
            transcript_response = requests.get(transcription_url)

            if transcript_response.status_code == 200:
                # Transcript is available
                analysis_status.has_transcript = True
                logger.info(f"Transcript available for call {call_uuid}")
            else:
                logger.info(f"Transcript not yet available for call {call_uuid}: {transcript_response.status_code}")

        # Check call recording if needed
        if not analysis_status.has_recording:
            recording_url = f"{API_BASE_URL}/call_recording/{ultravox_call_id}"
            logger.info(f"Checking recording for call {call_uuid} at {recording_url}")
            recording_response = requests.get(recording_url)

            if recording_response.status_code == 200:
                # Recording is available
                analysis_status.has_recording = True
                logger.info(f"Recording available for call {call_uuid}")
            else:
                logger.info(f"Recording not yet available for call {call_uuid}: {recording_response.status_code}")

        # Check call analytics (for summary) if needed
        if not analysis_status.has_summary:
            analytics_url = f"{API_BASE_URL}/call_analytics/{ultravox_call_id}/{call_uuid}"
            logger.info(f"Checking analytics for call {call_uuid} at {analytics_url}")
            analytics_response = requests.get(analytics_url)

            if analytics_response.status_code == 200:
                data = analytics_response.json()
                if (data.get("status") == "success" and
                        data.get("analytics") and
                        data.get("analytics").get("ultravox") and
                        data.get("analytics").get("ultravox").get("summary")):
                    # Summary is available
                    analysis_status.has_summary = True
                    logger.info(f"Summary available for call {call_uuid}")
                else:
                    logger.info(f"Summary not found in response for call {call_uuid}")
            else:
                logger.info(f"Analytics not yet available for call {call_uuid}: {analytics_response.status_code}")

        # Check for entity extraction (additional analysis) - no need to track this
        entities_url = f"{API_BASE_URL}/analyze_transcript/{ultravox_call_id}"
        entities_response = requests.get(entities_url)

        # Check if all required components are available
        is_complete = analysis_status.has_transcript and analysis_status.has_recording and analysis_status.has_summary
        analysis_status.is_complete = is_complete

        # Save the updated status
        db_session.commit()

        logger.info(f"Analysis checks completed for call {call_uuid}:")
        logger.info(f"- Transcript: {analysis_status.has_transcript}")
        logger.info(f"- Recording: {analysis_status.has_recording}")
        logger.info(f"- Summary: {analysis_status.has_summary}")
        logger.info(f"- Overall: {is_complete}")

        # If we have a call_log_id and the campaign_id, update the campaign's analysis progress
        if is_complete and call_log_id:
            # Get campaign ID from call log
            call_log = db_session.query(CallLog).filter_by(id=call_log_id).first()
            if call_log and call_log.campaign_id:
                # Update analysis progress for this campaign
                update_campaign_analysis_progress(call_log.campaign_id, db_session)

        close_db_session(db_session)

    except Exception as e:
        logger.error(f"Error checking/initiating analysis for call {call_uuid}: {str(e)}")
        logger.error(traceback.format_exc())

        try:
            # Update error message in the status record
            db_session = get_db_session_with_retry()
            analysis_status = db_session.query(CallAnalysisStatus).filter_by(call_uuid=call_uuid).first()
            if analysis_status:
                analysis_status.error_message = str(e)
                db_session.commit()
            close_db_session(db_session)
        except Exception as db_err:
            logger.error(f"Error updating analysis status error message: {str(db_err)}")
            # Don't raise, just log


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


