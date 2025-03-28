import plivo
import json
import threading
import time
from flask import Blueprint, request, jsonify, current_app
import logging
from datetime import datetime
import requests
from config import PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, NGROK_URL, setup_logging, SYSTEM_PROMPT, DEFAULT_VAD_SETTINGS, \
    ULTRAVOX_API_BASE_URL, ULTRAVOX_API_KEY
from utils import get_join_url
from models import CallMapping, CallLog, Agent, Campaign, CampaignContact, SavedPhoneNumber
from database import get_db_session, close_db_session, get_db_session_with_retry
import traceback

# Set up logging
logger = setup_logging("api_controller", "api_controller.log")

# Create a Blueprint for API routes
api = Blueprint('api', __name__)


# Helper function to parse Plivo datetime strings
def parse_plivo_datetime(date_string):
    """
    Parse Plivo datetime strings into Python datetime objects
    Handles various formats including those with timezone info
    """
    if not date_string:
        return None

    try:
        # Try the format with timezone offset (e.g., '2025-03-27 15:20:31+05:30')
        return datetime.strptime(date_string, '%Y-%m-%d %H:%M:%S%z')
    except ValueError:
        try:
            # Try without timezone (e.g., '2025-03-27 15:20:31')
            return datetime.strptime(date_string, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            # Log the issue and return current time as fallback
            logger.warning(f"Could not parse datetime string: {date_string}")
            return datetime.now()


@api.route('/make_call', methods=['POST'])
def make_call_api():
    """
    API endpoint for making a call with custom parameters.
    Enhanced to work with new database schema.
    """
    try:
        data = request.json
        logger.info(f"Received call request: {data}")

        # Validate required fields
        required_fields = ["recipient_phone_number", "plivo_phone_number"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"status": "error", "message": f"Missing required field: {field}"}), 400

        # Extract parameters
        recipient_number = data["recipient_phone_number"]
        plivo_number = data["plivo_phone_number"]

        # Optional parameters with defaults
        system_prompt = data.get("system_prompt", SYSTEM_PROMPT)  # Will use config default if None
        language_hint = data.get("language_hint", "hi")
        max_duration = data.get("max_duration", "180s")
        voice = data.get("voice", "Maushmi")
        vad_settings = data.get("vad_settings", DEFAULT_VAD_SETTINGS)
        agent_id = data.get("agent_id")
        campaign_id = data.get("campaign_id")

        # Handle initial_messages formatting
        initial_messages = data.get("initial_messages", [])
        # Format for Ultravox API - it only needs the text field
        formatted_initial_messages = []
        # for msg in initial_messages:
        #     if isinstance(msg, str):
        #         formatted_initial_messages.append({"text": msg})
        #     elif isinstance(msg, dict) and "text" in msg:
        #         formatted_initial_messages.append({"text": msg["text"]})

        inactivity_messages = data.get("inactivity_messages", [{"duration": "8s", "message": "are you there?"}])
        recording_enabled = data.get("recording_enabled", True)

        # Initialize Plivo client
        logger.info(f"Initializing Plivo client with Auth ID: {PLIVO_AUTH_ID[:5]}*****")
        plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

        # Check if agent exists if agent_id is provided
        agent = None
        db_session = get_db_session_with_retry()
        try:
            if agent_id:
                agent = db_session.query(Agent).filter_by(agent_id=agent_id).first()
                if agent:
                    # Use agent's configuration if available
                    if agent.system_prompt:
                        system_prompt = agent.system_prompt

                    # Parse settings JSON
                    settings = json.loads(agent.settings)

                    if settings.get("language_hint"):
                        language_hint = settings["language_hint"]

                    if settings.get("voice"):
                        voice = settings["voice"]

                    if settings.get("max_duration"):
                        max_duration = settings["max_duration"]

                    if settings.get("vad_settings"):
                        vad_settings = settings["vad_settings"]

                    if settings.get("inactivity_messages"):
                        inactivity_messages = settings["inactivity_messages"]

                    if settings.get("recording_enabled") is not None:
                        recording_enabled = settings["recording_enabled"]

                    initial_messages = json.loads(agent.initial_messages)
                    # Format initial messages for Ultravox API
                    formatted_initial_messages = []
                    # for msg in initial_messages:
                    #     if isinstance(msg, str):
                    #         formatted_initial_messages.append({"text": msg})
                    #     elif isinstance(msg, dict) and "text" in msg:
                    #         formatted_initial_messages.append({"text": msg["text"]})

            # Check campaign if campaign_id is provided
            campaign = None
            if campaign_id:
                campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        except Exception as e:
            logger.error(f"Error checking agent or campaign: {str(e)}")
            # Continue with default values if agent lookup fails
            pass

        # Construct the answer URL
        answer_url = f"{NGROK_URL}/answer_url"
        if max_duration != "180s":
            answer_url += f"?max_duration={max_duration}"

        hangup_url = f"{NGROK_URL}/hangup_url"

        logger.info(f"Recipient number: {recipient_number}")
        logger.info(f"Plivo number: {plivo_number}")
        logger.info(f"Answer URL: {answer_url}")

        # Set custom parameters in the app context for this request
        if system_prompt:
            current_app.config["CUSTOM_SYSTEM_PROMPT"] = system_prompt
        current_app.config["CUSTOM_LANGUAGE_HINT"] = language_hint
        current_app.config["CUSTOM_VOICE"] = voice
        current_app.config["CUSTOM_MAX_DURATION"] = max_duration
        current_app.config["CUSTOM_VAD_SETTINGS"] = vad_settings
        current_app.config["CUSTOM_INITIAL_MESSAGES"] = formatted_initial_messages
        current_app.config["CUSTOM_INACTIVITY_MESSAGES"] = inactivity_messages
        current_app.config["CUSTOM_RECORDING_ENABLED"] = recording_enabled

        # Construct the Ultravox payload
        ultravox_payload = {
            "systemPrompt": system_prompt,
            "temperature": 0.2,
            "languageHint": language_hint,
            "voice": voice,
            "initialMessages": formatted_initial_messages,
            "maxDuration": max_duration,
            "inactivityMessages": inactivity_messages,
            "selectedTools": [],
            "recordingEnabled": recording_enabled,
            "transcriptOptional": True,
            "medium": {"plivo": {}},
            "vadSettings": vad_settings
        }

        # Get join URL from Ultravox API
        join_url, ultravox_call_id = get_join_url(ultravox_payload)

        # Initiate the call
        call = plivo_client.calls.create(
            from_=plivo_number,
            to_=recipient_number,
            answer_url=answer_url,
            hangup_url=hangup_url,
            answer_method='GET',
            hangup_method='POST'
        )

        # Log successful call initiation
        logger.info(f"Call initiated successfully!")
        logger.info(f"Call UUID: {call.request_uuid}")
        logger.info(f"Ultravox Call ID: {ultravox_call_id}")
        logger.info(f"Call mapping created: Plivo UUID {call.request_uuid} -> Ultravox ID {ultravox_call_id}")

        # Save the phone numbers to the database if they don't exist
        try:
            # Normalize phone numbers
            if not recipient_number.startswith('+'):
                recipient_number = '+' + recipient_number

            if not plivo_number.startswith('+'):
                plivo_number = '+' + plivo_number

            # Check if recipient number exists
            recipient = db_session.query(SavedPhoneNumber).filter_by(phone_number=recipient_number).first()
            if not recipient:
                new_recipient = SavedPhoneNumber(
                    phone_number=recipient_number,
                    number_type='recipient',
                    last_used=datetime.now()
                )
                db_session.add(new_recipient)
            else:
                # Update last_used time
                recipient.last_used = datetime.now()

            # Check if from number exists
            from_num = db_session.query(SavedPhoneNumber).filter_by(phone_number=plivo_number).first()
            if not from_num:
                new_from = SavedPhoneNumber(
                    phone_number=plivo_number,
                    number_type='from',
                    last_used=datetime.now()
                )
                db_session.add(new_from)
            else:
                # Update last_used time
                from_num.last_used = datetime.now()

            db_session.commit()
        except Exception as e:
            logger.error(f"Error saving phone numbers: {str(e)}")
            # Continue if saving phone numbers fails

        # Create a new CallLog record
        try:
            new_call = CallLog(
                call_uuid=call.request_uuid,
                ultravox_id=ultravox_call_id,
                agent_id=agent_id,
                campaign_id=campaign_id,
                to_number=recipient_number,
                from_number=plivo_number,
                initiation_time=datetime.now(),
                system_prompt=system_prompt,
                language_hint=language_hint,
                voice=voice,
                max_duration=max_duration
            )

            db_session.add(new_call)

            # Also maintain the legacy CallMapping for backward compatibility
            call_mapping = CallMapping(
                plivo_call_uuid=call.request_uuid,
                ultravox_call_id=ultravox_call_id,
                recipient_phone_number=recipient_number,
                plivo_phone_number=plivo_number,
                system_prompt=system_prompt
            )

            db_session.add(call_mapping)

            # If this is a campaign call, update the campaign contact
            if campaign_id:
                contact = db_session.query(CampaignContact).filter_by(
                    campaign_id=campaign_id,
                    phone=recipient_number,
                    status='pending'
                ).first()

                if contact:
                    contact.status = 'calling'
                    contact.call_uuid = call.request_uuid

            db_session.commit()
            logger.info(f"Call record created in database: {new_call.id}")

        except Exception as e:
            logger.error(f"Error creating call records: {str(e)}")
            logger.error(traceback.format_exc())
            # Continue even if database operations fail

        # Return success response with call UUID and Ultravox call ID
        return jsonify({
            "status": "success",
            "message": "Call initiated successfully",
            "call_uuid": call.request_uuid,
            "ultravox_call_id": ultravox_call_id,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error in make_call_api: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        try:
            close_db_session(db_session)
        except:
            pass


@api.route('/call_status/<call_uuid>', methods=['GET'])
def get_call_status(call_uuid):
    """
    Get the status of a call by UUID with improved handling for different Plivo APIs
    """
    try:
        status_param = request.args.get('status')
        plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

        # Get database session to check and update our records
        db_session = get_db_session_with_retry()
        call_log = None

        try:
            # Check if we have a record for this call
            call_log = db_session.query(CallLog).filter_by(call_uuid=call_uuid).first()
        except Exception as e:
            logger.warning(f"Error checking call log: {str(e)}")
            # Continue even if DB check fails

        if status_param == 'live':
            # Try to get live call details
            try:
                response = plivo_client.live_calls.get(call_uuid)

                # Create response with all available fields
                live_data = {
                    "api_id": getattr(response, 'api_id', None),
                    "call_status": getattr(response, 'call_status', None),
                    "call_uuid": getattr(response, 'call_uuid', call_uuid),
                    "caller_name": getattr(response, 'caller_name', ''),
                    "direction": getattr(response, 'direction', None),
                    "from_number": getattr(response, 'from_number', None),
                    "request_uuid": getattr(response, 'request_uuid', None),
                    "session_start": getattr(response, 'session_start', None),
                    "to": getattr(response, 'to', None),
                    "stir_attestation": getattr(response, 'stir_attestation', 'N/A'),
                    "stir_verification": getattr(response, 'stir_verification', 'N/A')
                }

                # Update call log if we have one
                if call_log:
                    call_log.call_state = live_data['call_status']
                    # Store the JSON data for reference
                    call_log.plivo_data = json.dumps(live_data)
                    db_session.commit()

                return jsonify({
                    "status": "success",
                    "call_status": live_data['call_status'],
                    "details": live_data
                })

            except plivo.exceptions.ResourceNotFoundError:
                # Call is not live anymore
                return jsonify({
                    "status": "error",
                    "error": "call not found"
                }), 404

        else:
            # Try to get completed call details
            try:
                response = plivo_client.calls.get(call_uuid)

                # Create complete call data dictionary with all fields
                call_data = {
                    "answer_time": getattr(response, 'answer_time', None),
                    "api_id": getattr(response, 'api_id', None),
                    "bill_duration": getattr(response, 'bill_duration', 0),
                    "billed_duration": getattr(response, 'billed_duration', 0),
                    "call_direction": getattr(response, 'call_direction', None),
                    "call_duration": getattr(response, 'call_duration', 0),
                    "call_state": getattr(response, 'call_state', None),
                    "call_uuid": getattr(response, 'call_uuid', call_uuid),
                    "cnam_lookup": getattr(response, 'cnam_lookup', 'N/A'),
                    "conference_uuid": getattr(response, 'conference_uuid', None),
                    "end_time": getattr(response, 'end_time', None),
                    "from_number": getattr(response, 'from_number', None),
                    "hangup_cause_code": getattr(response, 'hangup_cause_code', None),
                    "hangup_cause_name": getattr(response, 'hangup_cause_name', None),
                    "hangup_source": getattr(response, 'hangup_source', None),
                    "initiation_time": getattr(response, 'initiation_time', None),
                    "parent_call_uuid": getattr(response, 'parent_call_uuid', None),
                    "resource_uri": getattr(response, 'resource_uri', None),
                    "source_ip": getattr(response, 'source_ip', 'N/A'),
                    "stir_attestation": getattr(response, 'stir_attestation', 'N/A'),
                    "stir_verification": getattr(response, 'stir_verification', 'N/A'),
                    "to_number": getattr(response, 'to_number', None),
                    "total_amount": getattr(response, 'total_amount', "0.00000"),
                    "total_rate": getattr(response, 'total_rate', "0.00000"),
                    "voice_network_group": getattr(response, 'voice_network_group', 'N/A')
                }

                # Update call log if we have one
                if call_log:
                    # Update essential fields
                    call_log.call_state = call_data['call_state']
                    call_log.call_duration = int(call_data['call_duration']) if call_data['call_duration'] else 0

                    # Parse datetime strings properly
                    if call_data['answer_time']:
                        call_log.answer_time = parse_plivo_datetime(call_data['answer_time'])
                    if call_data['end_time']:
                        call_log.end_time = parse_plivo_datetime(call_data['end_time'])
                    if call_data['initiation_time']:
                        call_log.initiation_time = parse_plivo_datetime(call_data['initiation_time'])

                    call_log.hangup_cause = call_data['hangup_cause_name']
                    call_log.hangup_source = call_data['hangup_source']

                    # Store the JSON data for reference
                    call_log.plivo_data = json.dumps(call_data)
                    db_session.commit()

                return jsonify({
                    "status": "success",
                    "call": call_data
                })

            except plivo.exceptions.ResourceNotFoundError:
                # Call truly doesn't exist
                return jsonify({
                    "status": "error",
                    "message": "Call not found in either live or completed calls"
                }), 404

    except Exception as e:
        logger.error(f"Error in get_call_status: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        try:
            close_db_session(db_session)
        except:
            pass


@api.route('/recent_calls', methods=['GET'])
def get_recent_calls():
    """
    Get a list of recent calls with pagination
    Enhanced to use the CallLog table
    """
    try:
        # Get pagination parameters
        limit = int(request.args.get('limit', '20'))
        offset = int(request.args.get('offset', '0'))

        db_session = get_db_session_with_retry()

        # Query the CallLog table
        total_count = db_session.query(CallLog).count()

        calls_query = db_session.query(CallLog)

        # Apply filtering if needed
        campaign_id = request.args.get('campaign_id')
        if campaign_id:
            calls_query = calls_query.filter_by(campaign_id=int(campaign_id))

        agent_id = request.args.get('agent_id')
        if agent_id:
            calls_query = calls_query.filter_by(agent_id=agent_id)

        # Order by most recent first
        calls_query = calls_query.order_by(CallLog.created_at.desc())

        # Apply pagination
        calls = calls_query.limit(limit).offset(offset).all()

        # Format the response
        formatted_calls = []
        for call in calls:
            formatted_call = {
                "call_uuid": call.call_uuid,
                "ultravox_id": call.ultravox_id,
                "from_number": call.from_number,
                "to_number": call.to_number,
                "call_state": call.call_state,
                "call_duration": call.call_duration,
                "initiation_time": call.initiation_time.isoformat() if call.initiation_time else None,
                "answer_time": call.answer_time.isoformat() if call.answer_time else None,
                "end_time": call.end_time.isoformat() if call.end_time else None,
                "hangup_cause": call.hangup_cause,
                "campaign_id": call.campaign_id,
                "agent_id": call.agent_id
            }

            # If agent data is requested, include agent name
            if call.agent_id:
                agent = db_session.query(Agent).filter_by(agent_id=call.agent_id).first()
                if agent:
                    formatted_call["agent_name"] = agent.name

            # If campaign data is requested, include campaign name
            if call.campaign_id:
                campaign = db_session.query(Campaign).filter_by(campaign_id=call.campaign_id).first()
                if campaign:
                    formatted_call["campaign_name"] = campaign.campaign_name

            formatted_calls.append(formatted_call)

        return jsonify({
            "status": "success",
            "calls": formatted_calls,
            "meta": {
                "limit": limit,
                "offset": offset,
                "total_count": total_count
            }
        })
    except Exception as e:
        logger.error(f"Error in get_recent_calls: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        try:
            close_db_session(db_session)
        except:
            pass


@api.route('/call_details/<call_uuid>', methods=['GET'])
def get_call_details(call_uuid):
    """
    Get detailed information about a specific call
    """
    try:
        db_session = get_db_session_with_retry()

        # Get the call from our database
        call = db_session.query(CallLog).filter_by(call_uuid=call_uuid).first()

        if not call:
            return jsonify({
                "status": "error",
                "message": f"Call with UUID {call_uuid} not found"
            }), 404

        # Build the response with comprehensive information
        call_details = call.to_dict()

        # Add agent information if available
        if call.agent_id:
            agent = db_session.query(Agent).filter_by(agent_id=call.agent_id).first()
            if agent:
                call_details["agent"] = {
                    "id": agent.agent_id,
                    "name": agent.name
                }

        # Add campaign information if available
        if call.campaign_id:
            campaign = db_session.query(Campaign).filter_by(campaign_id=call.campaign_id).first()
            if campaign:
                call_details["campaign"] = {
                    "id": campaign.campaign_id,
                    "name": campaign.campaign_name
                }

        # Include Plivo data if stored
        if call.plivo_data:
            call_details["plivo_data"] = json.loads(call.plivo_data)

        # Include Ultravox data if stored
        if call.ultravox_data:
            call_details["ultravox_data"] = json.loads(call.ultravox_data)

        return jsonify({
            "status": "success",
            "call": call_details
        })

    except Exception as e:
        logger.error(f"Error in get_call_details: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        try:
            close_db_session(db_session)
        except:
            pass


@api.route('/call_mapping/<call_uuid>', methods=['GET'])
def get_call_mapping(call_uuid):
    """
    Get the mapping between Plivo call_uuid and Ultravox call_id
    Enhanced to use the CallLog table first
    """
    try:
        db_session = get_db_session_with_retry()

        # First try to get the mapping from CallLog
        call_log = db_session.query(CallLog).filter_by(call_uuid=call_uuid).first()

        if call_log and call_log.ultravox_id:
            return jsonify({
                "status": "success",
                "mapping": {
                    "plivo_call_uuid": call_uuid,
                    "ultravox_call_id": call_log.ultravox_id,
                    "recipient_phone_number": call_log.to_number,
                    "plivo_phone_number": call_log.from_number,
                    "source": "call_log"
                }
            })

        # Fall back to legacy mapping if not found in CallLog
        call_mapping = db_session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()

        if call_mapping:
            return jsonify({
                "status": "success",
                "mapping": {
                    "plivo_call_uuid": call_mapping.plivo_call_uuid,
                    "ultravox_call_id": call_mapping.ultravox_call_id,
                    "recipient_phone_number": call_mapping.recipient_phone_number,
                    "plivo_phone_number": call_mapping.plivo_phone_number,
                    "source": "call_mapping"
                }
            })
        else:
            return jsonify({
                "status": "error",
                "message": f"No mapping found for call UUID: {call_uuid}"
            }), 404
    except Exception as e:
        logger.error(f"Error in get_call_mapping: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        try:
            close_db_session(db_session)
        except:
            pass


@api.route('/set_call_mapping/<call_uuid>/<ultravox_call_id>', methods=['GET'])
def set_call_mapping(call_uuid, ultravox_call_id):
    """
    Temporary endpoint to set a call mapping for testing
    Enhanced to update CallLog as well
    """
    try:
        db_session = get_db_session_with_retry()

        # Check if call exists in CallLog
        call_log = db_session.query(CallLog).filter_by(call_uuid=call_uuid).first()

        if call_log:
            # Update the Ultravox ID
            call_log.ultravox_id = ultravox_call_id
            logger.info(f"Updated CallLog: {call_uuid} -> {ultravox_call_id}")
        else:
            # Create a new CallLog entry
            new_call = CallLog(
                call_uuid=call_uuid,
                ultravox_id=ultravox_call_id,
                to_number="Unknown",
                from_number="Unknown",
                initiation_time=datetime.now()
            )
            db_session.add(new_call)
            logger.info(f"Created new CallLog: {call_uuid} -> {ultravox_call_id}")

        # Check if mapping already exists in legacy table
        existing_mapping = db_session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()

        if existing_mapping:
            existing_mapping.ultravox_call_id = ultravox_call_id
            logger.info(f"Updated legacy mapping: {call_uuid} -> {ultravox_call_id}")
        else:
            # Create new mapping in legacy table
            new_mapping = CallMapping(
                plivo_call_uuid=call_uuid,
                ultravox_call_id=ultravox_call_id,
                recipient_phone_number="Unknown",
                plivo_phone_number="Unknown"
            )
            db_session.add(new_mapping)
            logger.info(f"Created legacy mapping: {call_uuid} -> {ultravox_call_id}")

        db_session.commit()

        return jsonify({
            "status": "success",
            "message": f"Updated mapping for call UUID: {call_uuid}",
            "mapping": {
                "plivo_call_uuid": call_uuid,
                "ultravox_call_id": ultravox_call_id
            }
        })
    except Exception as e:
        logger.error(f"Error setting call mapping: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        try:
            close_db_session(db_session)
        except:
            pass