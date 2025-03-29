import os
from flask import Flask, Response, request, jsonify, current_app
from datetime import datetime
import json
from flask_cors import CORS
import logging
import threading
import traceback

# Import from configuration and utilities
from config import setup_logging, ULTRAVOX_API_BASE_URL, DEFAULT_VAD_SETTINGS, SYSTEM_PROMPT
from utils import get_join_url
from api_controller import api
from analysis_controller import analysis
from agent_controller import agent
from phone_controller import phone
from campaign_controller import campaign
from database import init_db, get_db_session, close_db_session, get_db_session_with_retry
from models import CallLog, CallMapping, Agent


# Create a filter to ignore frequent endpoint logs
class EndpointFilter(logging.Filter):
    def filter(self, record):
        message = record.getMessage()
        # Don't log status endpoint requests
        if 'GET /status' in message or 'OPTIONS /status' in message:
            return False
        # Don't log routine call status checks
        if 'GET /api/call_status/' in message:
            return False
        return True


# Apply the filter to the Werkzeug logger
logging.getLogger('werkzeug').addFilter(EndpointFilter())

# Optionally, set Werkzeug logger to only show warnings and errors
# Uncomment the line below if you want to further reduce log output
# logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Set up logging
logger = setup_logging("plivo_server", "plivo_server.log")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the database
init_db()

# Register the API blueprints
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(analysis, url_prefix='/api')
app.register_blueprint(agent, url_prefix='/api')
app.register_blueprint(phone, url_prefix='/api')
app.register_blueprint(campaign, url_prefix='/api')


@app.route('/answer_url', methods=['GET'])
def answer_url():
    """
    This endpoint is called by Plivo when a call is answered.
    Updated to work with new database schema.
    """
    call_uuid = request.args.get('CallUUID', 'unknown')
    logger.info(f"Call answered - CallUUID: {call_uuid}")
    logger.info(f"Request args: {request.args}")

    # Use the max_duration from request args or default to "180s"
    max_duration = request.args.get('max_duration', "180s")

    # Check if custom parameters were set for this request
    system_prompt = current_app.config.get("CUSTOM_SYSTEM_PROMPT", SYSTEM_PROMPT)
    language_hint = current_app.config.get("CUSTOM_LANGUAGE_HINT", "hi")
    voice = current_app.config.get("CUSTOM_VOICE", "Maushmi")
    vad_settings = current_app.config.get("CUSTOM_VAD_SETTINGS", DEFAULT_VAD_SETTINGS)

    # Ensure initial_messages is properly formatted
    initial_messages = current_app.config.get("CUSTOM_INITIAL_MESSAGES", [])

    # Format initial messages correctly for Ultravox API
    formatted_initial_messages = []
    # for msg in initial_messages:
    #     if isinstance(msg, str):
    #         formatted_initial_messages.append({"text": msg})
    #     elif isinstance(msg, dict) and "text" in msg:
    #         formatted_initial_messages.append({"text": msg["text"]})

    inactivity_messages = current_app.config.get("CUSTOM_INACTIVITY_MESSAGES",
                                                 [{"duration": "8s", "message": "are you there?"}])
    recording_enabled = current_app.config.get("CUSTOM_RECORDING_ENABLED", True)

    logger.info(f"Using system_prompt: {system_prompt[:50]}...")
    logger.info(f"Using language_hint: {language_hint}")
    logger.info(f"Using voice: {voice}")
    logger.info(f"Using max_duration: {max_duration}")
    logger.info(f"Using vad_settings: {vad_settings}")
    logger.info(f"Using initial_messages: {formatted_initial_messages}")
    logger.info(f"Using inactivity_messages: {inactivity_messages}")
    logger.info(f"Using recording_enabled: {recording_enabled}")

    # Set up the Ultravox payload
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

    try:
        # Get join URL from Ultravox API
        join_url, call_id = get_join_url(ultravox_payload)

        # Store call ID for future reference
        logger.info(f"Ultravox call ID: {call_id}")

        # Store the call_id in app context for use when the call is hung up
        current_app.config["CURRENT_ULTRAVOX_CALL_ID"] = call_id
        current_app.config["CURRENT_PLIVO_CALL_UUID"] = call_uuid

        # Get phone numbers from request
        recipient_number = request.args.get('To', '')
        from_number = request.args.get('From', '')

        # Update the database with call information
        try:
            db_session = get_db_session_with_retry()

            # First check if a CallLog record already exists for this call_uuid
            call_log = db_session.query(CallLog).filter_by(call_uuid=call_uuid).first()

            if call_log:
                # Update the existing record
                logger.info(f"Updating existing call record: {call_uuid}")
                call_log.ultravox_id = call_id
                if not call_log.to_number:
                    call_log.to_number = recipient_number
                if not call_log.from_number:
                    call_log.from_number = from_number
                call_log.system_prompt = system_prompt
                call_log.language_hint = language_hint
                call_log.voice = voice
                call_log.max_duration = max_duration
            else:
                # Create a new CallLog record
                logger.info(f"Creating new call record: {call_uuid}")
                new_call = CallLog(
                    call_uuid=call_uuid,
                    ultravox_id=call_id,
                    to_number=recipient_number,
                    from_number=from_number,
                    system_prompt=system_prompt,
                    language_hint=language_hint,
                    voice=voice,
                    max_duration=max_duration,
                    initiation_time=datetime.now()
                )
                db_session.add(new_call)

            # Also maintain the legacy mapping for backward compatibility
            # Check if mapping already exists
            existing_mapping = db_session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()

            if existing_mapping:
                logger.info(f"Updating existing call mapping: {call_uuid} -> {call_id}")
                existing_mapping.ultravox_call_id = call_id
                existing_mapping.recipient_phone_number = recipient_number
                existing_mapping.plivo_phone_number = from_number
                existing_mapping.system_prompt = system_prompt
            else:
                # Create a new mapping
                logger.info(f"Creating new call mapping: {call_uuid} -> {call_id}")
                new_mapping = CallMapping(
                    plivo_call_uuid=call_uuid,
                    ultravox_call_id=call_id,
                    recipient_phone_number=recipient_number,
                    plivo_phone_number=from_number,
                    system_prompt=system_prompt
                )
                db_session.add(new_mapping)

            db_session.commit()
            logger.info(f"Database updated successfully for call {call_uuid}")
        except Exception as e:
            logger.error(f"Error updating database in answer_url: {str(e)}")
            logger.error(traceback.format_exc())
        finally:
            close_db_session(db_session)

        # Validate the join_url format
        if not join_url.startswith("wss://"):
            logger.error(f"Invalid join_url format: {join_url}")
            return Response("Error: Invalid join URL format", status=500)

        # Properly formatted XML response for Plivo - simplified to avoid whitespace issues
        xml_response = f'<Response><Stream keepCallAlive="true" contentType="audio/x-l16;rate=16000" bidirectional="true">{join_url}</Stream></Response>'

        logger.info(f"Sending XML response to Plivo: {xml_response}")
        return Response(xml_response, mimetype='application/xml')

    except Exception as e:
        error_msg = f"Error processing answer_url: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return Response(f"Error: {str(e)}", status=500)


@app.route('/hangup_url', methods=['POST'])
def hangup_url():
    """
    This endpoint is called by Plivo when a call is hung up.
    Updated to work with new database schema.
    """
    logger.info("Call hung up")
    logger.info(f"Hangup data: {request.form}")

    # Log important call details
    call_uuid = request.form.get('CallUUID', 'unknown')
    call_status = request.form.get('CallStatus', 'unknown')
    duration = request.form.get('Duration', 'unknown')
    hangup_cause_name = request.form.get('HangupCause', 'unknown')

    logger.info(f"Call {call_uuid} ended with status {call_status}")
    logger.info(f"Call duration: {duration} seconds, Hangup cause: {hangup_cause_name}")

    # Get the Ultravox call ID from app context if available
    ultravox_call_id = current_app.config.get("CURRENT_ULTRAVOX_CALL_ID")
    logger.info(f"Hangup handler app context Ultravox ID: {ultravox_call_id}")

    # Get call details from the request form
    recipient_number = request.form.get('To', '')
    plivo_number = request.form.get('From', '')
    bill_duration = request.form.get('BillDuration', '0')
    total_cost = request.form.get('TotalCost', '0')

    # Update the database with call information
    try:
        db_session = get_db_session_with_retry()

        # Update CallLog record
        call_log = db_session.query(CallLog).filter_by(call_uuid=call_uuid).first()

        if call_log:
            # Update existing record
            logger.info(f"Updating existing call record on hangup: {call_uuid}")
            if ultravox_call_id and not call_log.ultravox_id:
                call_log.ultravox_id = ultravox_call_id

            # Update call details
            call_log.call_state = call_status
            call_log.call_duration = int(duration) if duration and duration != 'unknown' else None
            call_log.hangup_cause_name = hangup_cause_name if hangup_cause_name != 'unknown' else None
            call_log.end_time = datetime.now()

            # Store additional data
            plivo_data = call_log.plivo_data
            if plivo_data:
                try:
                    plivo_data_dict = json.loads(plivo_data)
                except:
                    plivo_data_dict = {}
            else:
                plivo_data_dict = {}

            plivo_data_dict.update({
                'bill_duration': bill_duration,
                'total_cost': total_cost,
                'hangup_data': {k: request.form.get(k) for k in request.form}
            })

            call_log.plivo_data = json.dumps(plivo_data_dict)
        else:
            # Create new record if it doesn't exist
            logger.info(f"Creating new call record on hangup: {call_uuid}")
            new_call = CallLog(
                call_uuid=call_uuid,
                ultravox_id=ultravox_call_id,
                to_number=recipient_number,
                from_number=plivo_number,
                call_state=call_status,
                call_duration=int(duration) if duration and duration != 'unknown' else None,
                hangup_cause_name=hangup_cause_name if hangup_cause_name != 'unknown' else None,
                initiation_time=datetime.now() - (datetime.now() - datetime.now()),  # Approximate
                end_time=datetime.now(),
                plivo_data=json.dumps({
                    'bill_duration': bill_duration,
                    'total_cost': total_cost,
                    'hangup_data': {k: request.form.get(k) for k in request.form}
                })
            )
            db_session.add(new_call)

        # Update legacy CallMapping
        if ultravox_call_id:
            # Check if mapping exists
            mapping = db_session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()

            if not mapping:
                # Create new mapping
                new_mapping = CallMapping(
                    plivo_call_uuid=call_uuid,
                    ultravox_call_id=ultravox_call_id,
                    recipient_phone_number=recipient_number,
                    plivo_phone_number=plivo_number
                )
                db_session.add(new_mapping)
                logger.info(f"Created new legacy mapping on hangup: {call_uuid} -> {ultravox_call_id}")

        db_session.commit()
        logger.info(f"Database updated successfully for call {call_uuid} on hangup")
    except Exception as e:
        logger.error(f"Error updating database in hangup_url: {str(e)}")
        logger.error(traceback.format_exc())
    finally:
        close_db_session(db_session)

    # Clear the stored call IDs
    current_app.config["CURRENT_ULTRAVOX_CALL_ID"] = None
    current_app.config["CURRENT_PLIVO_CALL_UUID"] = None

    return Response("<Response></Response>", mimetype='application/xml')


@app.route('/status', methods=['GET'])
def status():
    """
    Simple status endpoint to check if server is running.
    """
    # Note: We don't log status endpoint calls anymore
    return jsonify({
        "status": "Server is running",
        "timestamp": datetime.now().isoformat()
    })


@app.route('/', methods=['GET'])
def home():
    """
    Root endpoint that provides basic info
    """
    logger.info("Home endpoint called")
    return jsonify({
        "service": "Plivo Ultravox Integration",
        "endpoints": [
            "/answer_url - Plivo answer webhook",
            "/hangup_url - Plivo hangup webhook",
            "/status - Server status",
            "/api/make_call - API to initiate a call",
            "/api/call_status/<call_uuid> - Get call status",
            "/api/recent_calls - List recent calls",
            "/api/call_transcription/<call_id> - Get call transcription",
            "/api/call_recording/<call_id> - Get call recording URL",
            "/api/call_analytics/<call_id>/<call_uuid> - Get call analytics",
            "/api/agents - Manage agents",
            "/api/campaigns - Manage campaigns",
            "/api/phone-numbers - Manage saved phone numbers"
        ],
        "timestamp": datetime.now().isoformat()
    })


@app.errorhandler(Exception)
def handle_exception(e):
    """
    Global exception handler to log all errors
    """
    logger.error(f"Unhandled exception: {str(e)}")
    logger.error(traceback.format_exc())
    return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Set host to 0.0.0.0 to make it accessible from outside
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting server on port {port}")

    # Clear any previous custom configurations
    app.config["CUSTOM_SYSTEM_PROMPT"] = None
    app.config["CUSTOM_LANGUAGE_HINT"] = None
    app.config["CUSTOM_VOICE"] = None
    app.config["CUSTOM_MAX_DURATION"] = None
    app.config["CURRENT_ULTRAVOX_CALL_ID"] = None
    app.config["CURRENT_PLIVO_CALL_UUID"] = None

    app.run(debug=True, host='0.0.0.0', port=port)