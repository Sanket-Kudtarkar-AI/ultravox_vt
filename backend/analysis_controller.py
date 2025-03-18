import requests
import logging
from flask import Blueprint, request, jsonify, current_app
import plivo

from config import ULTRAVOX_API_KEY, ULTRAVOX_API_BASE_URL, PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, setup_logging

# Set up logging
logger = setup_logging("analysis_controller", "analysis_controller.log")

# Create a Blueprint for analysis API routes
analysis = Blueprint('analysis', __name__)


@analysis.route('/call_transcription/<call_id>', methods=['GET'])
def get_call_transcription(call_id):
    """
    Fetch call transcription from Ultravox API
    """
    try:
        logger.info(f"Fetching transcription for call ID: {call_id}")

        # API endpoint for Ultravox call messages
        api_url = f"{ULTRAVOX_API_BASE_URL}/calls/{call_id}/messages"

        # Set up headers with API key
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': ULTRAVOX_API_KEY
        }

        # Make the request to Ultravox API
        response = requests.get(api_url, headers=headers)

        # Check if the request was successful
        if response.status_code != 200:
            error_msg = f"Error from Ultravox API: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return jsonify({
                "status": "error",
                "message": error_msg
            }), response.status_code

        # Parse the response
        data = response.json()

        # Return the transcription data
        return jsonify({
            "status": "success",
            "results": data.get("results", []),
            "total": data.get("total", 0),
            "next": data.get("next"),
            "previous": data.get("previous")
        })

    except Exception as e:
        logger.error(f"Error in get_call_transcription: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@analysis.route('/call_recording/<call_id>', methods=['GET'])
def get_call_recording(call_id):
    """
    Fetch call recording URL from Ultravox API
    """
    try:
        logger.info(f"Fetching recording URL for call ID: {call_id}")

        # API endpoint for Ultravox call recording
        api_url = f"{ULTRAVOX_API_BASE_URL}/calls/{call_id}/recording"

        # Set up headers with API key
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': ULTRAVOX_API_KEY
        }

        # Make the request to Ultravox API
        response = requests.get(api_url, headers=headers)

        # Check if the request was successful - recording returns a 302 redirect
        if response.status_code in [200, 302]:
            # Get the redirect URL
            recording_url = response.url if response.status_code == 200 else response.headers.get('Location')

            return jsonify({
                "status": "success",
                "url": recording_url
            })
        else:
            error_msg = f"Error from Ultravox API: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return jsonify({
                "status": "error",
                "message": error_msg
            }), response.status_code

    except Exception as e:
        logger.error(f"Error in get_call_recording: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@analysis.route('/call_analytics/<call_id>/<call_uuid>', methods=['GET'])
def get_call_analytics(call_id, call_uuid):
    """
    Fetch and combine analytics data from both Ultravox and Plivo
    """
    try:
        logger.info(f"Fetching analytics for call ID: {call_id}, call UUID: {call_uuid}")

        analytics_data = {
            "ultravox": None,
            "plivo": None
        }

        # Fetch Ultravox call details
        try:
            api_url = f"{ULTRAVOX_API_BASE_URL}/calls/{call_id}"
            headers = {
                'Content-Type': 'application/json',
                'X-API-Key': ULTRAVOX_API_KEY
            }

            response = requests.get(api_url, headers=headers)

            if response.status_code == 200:
                ultravox_data = response.json()

                # Extract relevant data for analytics
                analytics_data["ultravox"] = {
                    "call_id": ultravox_data.get("callId"),
                    "created": ultravox_data.get("created"),
                    "joined": ultravox_data.get("joined"),
                    "ended": ultravox_data.get("ended"),
                    "end_reason": ultravox_data.get("endReason"),
                    "first_speaker": ultravox_data.get("firstSpeaker"),
                    "language_hint": ultravox_data.get("languageHint"),
                    "voice": ultravox_data.get("voice"),
                    "error_count": ultravox_data.get("errorCount"),
                    "summary": ultravox_data.get("summary"),
                    "short_summary": ultravox_data.get("shortSummary")
                }
        except Exception as e:
            logger.error(f"Error fetching Ultravox data: {str(e)}")

        # Fetch Plivo call details
        try:
            plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

            # Try to get call details from completed calls first
            try:
                call_details = plivo_client.calls.get(call_uuid)

                analytics_data["plivo"] = {
                    "call_uuid": call_uuid,
                    "from_number": call_details.from_number if hasattr(call_details, 'from_number') else None,
                    "to_number": call_details.to_number if hasattr(call_details, 'to_number') else None,
                    "call_direction": call_details.call_direction if hasattr(call_details, 'call_direction') else None,
                    "call_duration": call_details.call_duration if hasattr(call_details, 'call_duration') else None,
                    "bill_duration": call_details.bill_duration if hasattr(call_details, 'bill_duration') else None,
                    "call_state": call_details.call_state if hasattr(call_details, 'call_state') else None,
                    "end_time": call_details.end_time if hasattr(call_details, 'end_time') else None,
                    "initiation_time": call_details.initiation_time if hasattr(call_details,
                                                                               'initiation_time') else None,
                    "hangup_cause_name": call_details.hangup_cause_name if hasattr(call_details,
                                                                                   'hangup_cause_name') else None,
                    "hangup_source": call_details.hangup_source if hasattr(call_details, 'hangup_source') else None
                }
            except plivo.exceptions.ResourceNotFoundError:
                logger.info(f"Call {call_uuid} not found in completed calls, checking live calls")

                # If not found, try to get from live calls
                try:
                    live_call = plivo_client.live_calls.get(call_uuid)

                    analytics_data["plivo"] = {
                        "call_uuid": call_uuid,
                        "from_number": live_call.from_number if hasattr(live_call, 'from_number') else None,
                        "to": live_call.to if hasattr(live_call, 'to') else None,
                        "call_status": live_call.call_status if hasattr(live_call, 'call_status') else None,
                        "direction": live_call.direction if hasattr(live_call, 'direction') else None,
                        "caller_name": live_call.caller_name if hasattr(live_call, 'caller_name') else None
                    }
                except plivo.exceptions.ResourceNotFoundError:
                    logger.warning(f"Call {call_uuid} not found in live calls either")
        except Exception as e:
            logger.error(f"Error fetching Plivo data: {str(e)}")

        # Calculate combined analytics - for example, total call duration
        combined_stats = {}

        # Example: Calculate total duration from both APIs
        ultravox_duration = 0
        plivo_duration = 0

        if analytics_data["ultravox"] and analytics_data["ultravox"].get("created") and analytics_data["ultravox"].get(
                "ended"):
            from datetime import datetime
            created = datetime.fromisoformat(analytics_data["ultravox"]["created"].replace('Z', '+00:00'))
            ended = datetime.fromisoformat(analytics_data["ultravox"]["ended"].replace('Z', '+00:00'))
            ultravox_duration = (ended - created).total_seconds()

        if analytics_data["plivo"] and analytics_data["plivo"].get("call_duration"):
            plivo_duration = int(analytics_data["plivo"]["call_duration"])

        # Use the longer duration as the total
        combined_stats["total_duration"] = max(ultravox_duration, plivo_duration)

        # Return the combined analytics data
        return jsonify({
            "status": "success",
            "analytics": {
                "ultravox": analytics_data["ultravox"],
                "plivo": analytics_data["plivo"],
                "combined": combined_stats
            }
        })

    except Exception as e:
        logger.error(f"Error in get_call_analytics: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500