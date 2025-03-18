import plivo
import json
from flask import Blueprint, request, jsonify
import logging
import time
from datetime import datetime

from config import PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, NGROK_URL, setup_logging, SYSTEM_PROMPT, DEFAULT_VAD_SETTINGS
from utils import get_join_url

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
        from flask import current_app
        if system_prompt:
            current_app.config["CUSTOM_SYSTEM_PROMPT"] = system_prompt
        current_app.config["CUSTOM_LANGUAGE_HINT"] = language_hint
        current_app.config["CUSTOM_VOICE"] = voice
        current_app.config["CUSTOM_MAX_DURATION"] = max_duration
        current_app.config["CUSTOM_VAD_SETTINGS"] = vad_settings
        current_app.config["CUSTOM_INITIAL_MESSAGES"] = formatted_initial_messages
        current_app.config["CUSTOM_INACTIVITY_MESSAGES"] = inactivity_messages
        current_app.config["CUSTOM_RECORDING_ENABLED"] = recording_enabled

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

        # Return success response with call UUID
        return jsonify({
            "status": "success",
            "message": "Call initiated successfully",
            "call_uuid": call.request_uuid,
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

        # Try to get live call status first
        try:
            # Use the correct method for getting live call details
            # Based on your previous code in test.py, this should work
            response = plivo_client.live_calls.get(call_uuid)

            return jsonify({
                "status": "success",
                "call_status": "live",
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
            # If live call not found, try to get completed call details
            logger.info(f"Live call not found for UUID {call_uuid}. Checking call history.")

            try:
                response = plivo_client.calls.get(call_uuid)
                return jsonify({
                    "status": "success",
                    "call_status": "completed",
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



@api.route('/recent_calls', methods=['GET'])
def get_recent_calls():
    """
    Get a list of recent calls
    """
    try:
        # Initialize Plivo client
        plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

        # Get call records
        limit = request.args.get('limit', '10')
        offset = request.args.get('offset', '0')

        response = plivo_client.calls.list(limit=int(limit), offset=int(offset))

        # Format the response
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
                "total_count": len(calls)
            }
        })

    except Exception as e:
        logger.error(f"Error in get_recent_calls: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500