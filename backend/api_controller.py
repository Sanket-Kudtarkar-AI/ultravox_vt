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
from models import CallMapping
from database import get_db_session, close_db_session

# Set up logging
logger = setup_logging("api_controller", "api_controller.log")

# Create a Blueprint for API routes
api = Blueprint('api', __name__)


@api.route('/make_call', methods=['POST'])
def make_call_api():
    """
    API endpoint for making a call with custom parameters.
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

        # Handle initial_messages formatting
        initial_messages = data.get("initial_messages", [])
        # Format for Ultravox API - it only needs the text field
        formatted_initial_messages = []
        for msg in initial_messages:
            if isinstance(msg, str):
                formatted_initial_messages.append({"text": msg})
            elif isinstance(msg, dict) and "text" in msg:
                formatted_initial_messages.append({"text": msg["text"]})

        inactivity_messages = data.get("inactivity_messages", [{"duration": "8s", "message": "are you there?"}])
        recording_enabled = data.get("recording_enabled", True)

        # Initialize Plivo client
        logger.info(f"Initializing Plivo client with Auth ID: {PLIVO_AUTH_ID[:5]}*****")
        plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

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

        # Store the mapping in the database
        try:
            db_session = get_db_session()

            # Create a new CallMapping record
            call_mapping = CallMapping(
                plivo_call_uuid=call.request_uuid,
                ultravox_call_id=ultravox_call_id,
                recipient_phone_number=recipient_number,
                plivo_phone_number=plivo_number,
                system_prompt=system_prompt
            )

            db_session.add(call_mapping)
            db_session.commit()
            logger.info(f"Call mapping stored in database from make_call_api: {call_mapping}")
        except Exception as e:
            logger.error(f"Error storing call mapping in make_call_api: {str(e)}")
        finally:
            close_db_session(db_session)

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
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@api.route('/call_status/<call_uuid>', methods=['GET'])
def get_call_status(call_uuid):
    """
    Get the status of a call by UUID
    """
    try:
        # Initialize Plivo client
        plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

        # Get the Ultravox call ID from the database if available
        ultravox_call_id = None
        try:
            db_session = get_db_session()
            call_mapping = db_session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()
            if call_mapping:
                ultravox_call_id = call_mapping.ultravox_call_id
                # Only log this message once per minute per call_uuid
                current_time = time.time()
                last_log_time = getattr(get_call_status, f'last_log_time_{call_uuid}', 0)
                if current_time - last_log_time > 60:  # Log once per minute
                    logger.info(f"Found Ultravox call ID for {call_uuid}: {ultravox_call_id}")
                    setattr(get_call_status, f'last_log_time_{call_uuid}', current_time)
            else:
                # Only log this once per call_uuid
                if not hasattr(get_call_status, f'logged_no_mapping_{call_uuid}'):
                    logger.warning(f"No mapping found for call UUID: {call_uuid}")
                    setattr(get_call_status, f'logged_no_mapping_{call_uuid}', True)
        except Exception as e:
            logger.error(f"Error fetching call mapping: {str(e)}")
        finally:
            close_db_session(db_session)

        # Try to get live call status first
        try:
            # Use the correct method for getting live call details
            response = plivo_client.live_calls.get(call_uuid)

            return jsonify({
                "status": "success",
                "call_status": "live",
                "ultravox_call_id": ultravox_call_id,  # Include Ultravox call ID
                "details": {
                    "direction": response.direction if hasattr(response, 'direction') else None,
                    "from": response.from_number if hasattr(response, 'from_number') else None,
                    "to": response.to if hasattr(response, 'to') else None,
                    "call_status": response.call_status if hasattr(response, 'call_status') else None,
                    "caller_name": response.caller_name if hasattr(response, 'caller_name') else None,
                    "call_uuid": response.call_uuid if hasattr(response, 'call_uuid') else None,
                    "session_start": response.session_start if hasattr(response, 'session_start') else None
                }
            })
        except plivo.exceptions.ResourceNotFoundError:
            # Only log this message once per call status check within a time period
            if not hasattr(get_call_status, f'checked_history_{call_uuid}'):
                logger.info(f"Live call not found for UUID {call_uuid}. Checking call history.")
                setattr(get_call_status, f'checked_history_{call_uuid}', True)

                # Reset after 5 minutes
                def reset_flag():
                    if hasattr(get_call_status, f'checked_history_{call_uuid}'):
                        delattr(get_call_status, f'checked_history_{call_uuid}')

                timer = threading.Timer(300, reset_flag)
                timer.daemon = True
                timer.start()

            try:
                response = plivo_client.calls.get(call_uuid)
                return jsonify({
                    "status": "success",
                    "call_status": "completed",
                    "ultravox_call_id": ultravox_call_id,  # Include Ultravox call ID
                    "details": {
                        "answer_time": response.answer_time if hasattr(response, 'answer_time') else None,
                        "bill_duration": response.bill_duration if hasattr(response, 'bill_duration') else None,
                        "call_direction": response.call_direction if hasattr(response, 'call_direction') else None,
                        "call_duration": response.call_duration if hasattr(response, 'call_duration') else None,
                        "call_state": response.call_state if hasattr(response, 'call_state') else None,
                        "call_uuid": response.call_uuid if hasattr(response, 'call_uuid') else None,
                        "end_time": response.end_time if hasattr(response, 'end_time') else None,
                        "from_number": response.from_number if hasattr(response, 'from_number') else None,
                        "to_number": response.to_number if hasattr(response, 'to_number') else None,
                        "hangup_cause_name": response.hangup_cause_name if hasattr(response,
                                                                                   'hangup_cause_name') else None,
                        "hangup_source": response.hangup_source if hasattr(response, 'hangup_source') else None,
                        "initiation_time": response.initiation_time if hasattr(response, 'initiation_time') else None
                    }
                })
            except plivo.exceptions.ResourceNotFoundError:
                return jsonify({
                    "status": "error",
                    "message": "Call not found in either live or completed calls"
                }), 404
        except Exception as e:
            logger.error(f"Error getting live call: {str(e)}")
            return jsonify({
                "status": "error",
                "message": f"Error getting live call: {str(e)}"
            }), 500

    except Exception as e:
        logger.error(f"Error in get_call_status: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# In api_controller.py - optimize the get_recent_calls function
@api.route('/recent_calls', methods=['GET'])
def get_recent_calls():
    """Get a list of recent calls with optimized performance"""
    try:
        # Initialize Plivo client
        plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

        # Get pagination parameters
        limit = request.args.get('limit', '20')
        offset = request.args.get('offset', '0')

        # Use a more efficient query with fewer fields
        response = plivo_client.calls.list(
            limit=int(limit),
            offset=int(offset),
            subaccount=None  # Add any other filters that might help
        )

        # Format the response with minimal processing
        calls = []
        for call in response:
            calls.append({
                "call_uuid": call.call_uuid,
                "from_number": call.from_number,
                "to_number": call.to_number,
                "call_direction": call.call_direction,
                "call_duration": call.call_duration,
                "call_state": call.call_state,
                "initiation_time": call.initiation_time,
                "end_time": call.end_time if hasattr(call, 'end_time') else None
            })

        return jsonify({
            "status": "success",
            "calls": calls,
            "meta": {
                "limit": int(limit),
                "offset": int(offset),
                "total_count": len(calls)  # This is just for the current page
            }
        })
    except Exception as e:
        logger.error(f"Error in get_recent_calls: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@api.route('/call_mapping/<call_uuid>', methods=['GET'])
def get_call_mapping(call_uuid):
    """
    Get the mapping between Plivo call_uuid and Ultravox call_id
    """
    try:
        db_session = get_db_session()

        # Look up the mapping in the database
        call_mapping = db_session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()

        if call_mapping:
            return jsonify({
                "status": "success",
                "mapping": call_mapping.to_dict()
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
        close_db_session(db_session)


@api.route('/set_call_mapping/<call_uuid>/<ultravox_call_id>', methods=['GET'])
def set_call_mapping(call_uuid, ultravox_call_id):
    """
    Temporary endpoint to set a call mapping for testing
    """
    try:
        db_session = get_db_session()

        # Check if mapping already exists
        existing_mapping = db_session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()

        if existing_mapping:
            existing_mapping.ultravox_call_id = ultravox_call_id
            db_session.commit()
            logger.info(f"Updated mapping: {call_uuid} -> {ultravox_call_id}")
            return jsonify({
                "status": "success",
                "message": f"Updated mapping for call UUID: {call_uuid}"
            })
        else:
            # Create new mapping
            new_mapping = CallMapping(
                plivo_call_uuid=call_uuid,
                ultravox_call_id=ultravox_call_id,
                recipient_phone_number="Unknown",
                plivo_phone_number="Unknown"
            )

            db_session.add(new_mapping)
            db_session.commit()
            logger.info(f"Created mapping: {call_uuid} -> {ultravox_call_id}")
            return jsonify({
                "status": "success",
                "message": f"Created mapping for call UUID: {call_uuid}"
            })
    except Exception as e:
        logger.error(f"Error setting call mapping: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)
