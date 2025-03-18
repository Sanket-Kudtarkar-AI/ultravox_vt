import os
from flask import Flask, Response, request, jsonify, current_app
from datetime import datetime
import json
from flask_cors import CORS

# Import from configuration and utilities
from config import setup_logging, ULTRAVOX_API_BASE_URL, DEFAULT_VAD_SETTINGS, SYSTEM_PROMPT
from utils import get_join_url
from api_controller import api
from analysis_controller import analysis
from database import init_db, get_db_session, close_db_session
from models import CallMapping

# Set up logging
logger = setup_logging("plivo_server", "plivo_server.log")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the database
init_db()

# Register the API blueprints
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(analysis, url_prefix='/api')


@app.route('/answer_url', methods=['GET'])
def answer_url():
    """
    This endpoint is called by Plivo when a call is answered.
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
    # Note: Ultravox API expects initial messages to have text property only, no role
    formatted_initial_messages = []
    for msg in initial_messages:
        if isinstance(msg, str):
            formatted_initial_messages.append({"text": msg})
        elif isinstance(msg, dict) and "text" in msg:
            # Keep only the text field
            formatted_initial_messages.append({"text": msg["text"]})

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

        # Store the mapping in the database immediately
        try:
            db_session = get_db_session()

            # Check if mapping already exists
            existing_mapping = db_session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()

            if existing_mapping:
                logger.info(f"Updating existing call mapping: {call_uuid} -> {call_id}")
                existing_mapping.ultravox_call_id = call_id
                db_session.commit()
            else:
                # Create a new mapping
                recipient_number = request.args.get('To', '')
                from_number = request.args.get('From', '')

                new_mapping = CallMapping(
                    plivo_call_uuid=call_uuid,
                    ultravox_call_id=call_id,
                    recipient_phone_number=recipient_number,
                    plivo_phone_number=from_number,
                    system_prompt=system_prompt
                )

                db_session.add(new_mapping)
                db_session.commit()
                logger.info(f"Created new call mapping in answer_url: {call_uuid} -> {call_id}")
        except Exception as e:
            logger.error(f"Error storing call mapping in answer_url: {str(e)}")
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
        return Response(f"Error: {str(e)}", status=500)


@app.route('/hangup_url', methods=['POST'])
def hangup_url():
    """
    This endpoint is called by Plivo when a call is hung up.
    """
    logger.info("Call hung up")
    logger.info(f"Hangup data: {request.form}")

    # Log important call details
    call_uuid = request.form.get('CallUUID', 'unknown')
    call_status = request.form.get('CallStatus', 'unknown')
    duration = request.form.get('Duration', 'unknown')
    hangup_cause = request.form.get('HangupCause', 'unknown')

    logger.info(f"Call {call_uuid} ended with status {call_status}")
    logger.info(f"Call duration: {duration} seconds, Hangup cause: {hangup_cause}")

    # Get the Ultravox call ID from app context if available
    ultravox_call_id = current_app.config.get("CURRENT_ULTRAVOX_CALL_ID")
    logger.info(f"Hangup handler app context Ultravox ID: {ultravox_call_id}")

    if ultravox_call_id:
        logger.info(f"Associated Ultravox call ID: {ultravox_call_id}")

        # Save the mapping to the database if not already saved
        try:
            session = get_db_session()

            # Check if mapping exists
            existing_mapping = session.query(CallMapping).filter_by(plivo_call_uuid=call_uuid).first()

            if not existing_mapping:
                # Create new mapping
                recipient_number = request.form.get('To', '')
                plivo_number = request.form.get('From', '')

                new_mapping = CallMapping(
                    plivo_call_uuid=call_uuid,
                    ultravox_call_id=ultravox_call_id,
                    recipient_phone_number=recipient_number,
                    plivo_phone_number=plivo_number
                )

                session.add(new_mapping)
                session.commit()
                logger.info(f"Created new call mapping in hangup_url: {call_uuid} -> {ultravox_call_id}")
            else:
                logger.info(f"Call mapping already exists for {call_uuid} -> {existing_mapping.ultravox_call_id}")

                # Update the mapping if needed (e.g., if the call_id changed)
                if existing_mapping.ultravox_call_id != ultravox_call_id:
                    existing_mapping.ultravox_call_id = ultravox_call_id
                    session.commit()
                    logger.info(f"Updated existing call mapping: {call_uuid} -> {ultravox_call_id}")

        except Exception as e:
            logger.error(f"Error saving call mapping in hangup_url: {str(e)}")
        finally:
            close_db_session(session)
    else:
        logger.warning(f"No Ultravox call ID found in app context for call {call_uuid}")

    # Clear the stored call IDs
    current_app.config["CURRENT_ULTRAVOX_CALL_ID"] = None
    current_app.config["CURRENT_PLIVO_CALL_UUID"] = None

    return Response("<Response></Response>", mimetype='application/xml')


@app.route('/status', methods=['GET'])
def status():
    """
    Simple status endpoint to check if server is running.
    """
    logger.info("Status endpoint called")
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
            "/api/call_mapping/<call_uuid> - Get call mapping",
            "/api/set_call_mapping/<call_uuid>/<ultravox_call_id> - Set call mapping (for testing)"
        ],
        "timestamp": datetime.now().isoformat()
    })


@app.errorhandler(Exception)
def handle_exception(e):
    """
    Global exception handler to log all errors
    """
    logger.error(f"Unhandled exception: {str(e)}")
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