import requests
import logging
import traceback
from flask import Blueprint, request, jsonify, current_app, Response
import plivo
from config import ULTRAVOX_API_KEY, ULTRAVOX_API_BASE_URL, PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, setup_logging
import openai
import os
import re
import json
from datetime import datetime
from models import CallLog, CallAnalytics
from database import get_db_session, close_db_session

# Set up logging
logger = setup_logging("analysis_controller", "analysis_controller.log")

# Create a Blueprint for analysis API routes
analysis = Blueprint('analysis', __name__)


@analysis.route('/proxy_audio/<path:url>', methods=['GET'])
def proxy_audio(url):
    """
    Proxy endpoint to avoid CORS issues with audio files
    """
    try:
        logger.info(f"Proxying audio from URL: {url}")

        # Decode the URL if it's URL-encoded
        import urllib.parse
        decoded_url = urllib.parse.unquote(url)

        # Fetch the audio file
        response = requests.get(decoded_url, stream=True)

        if not response.ok:
            logger.error(f"Error fetching audio: {response.status_code} - {response.reason}")
            return jsonify({
                "status": "error",
                "message": f"Failed to fetch audio: {response.status_code} - {response.reason}"
            }), response.status_code

        # Set appropriate headers for audio streaming
        headers = {
            'Content-Type': response.headers.get('Content-Type', 'audio/wav'),
            'Content-Length': response.headers.get('Content-Length'),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'  # Allow cross-origin access
        }

        # Log success
        logger.info(
            f"Successfully proxying audio, content-type: {headers['Content-Type']}, size: {headers.get('Content-Length', 'unknown')}")

        # Stream the response
        return Response(
            response.iter_content(chunk_size=1024),
            headers=headers,
            status=200
        )

    except Exception as e:
        logger.error(f"Error proxying audio: {str(e)}")
        logger.error(traceback.format_exc())

        # Return a more detailed error for debugging
        return jsonify({
            "status": "error",
            "message": f"Server error: {str(e)}",
            "details": traceback.format_exc()
        }), 500


@analysis.route('/call_transcription/<call_id>', methods=['GET'])
def get_call_transcription(call_id):
    """
    Fetch call transcription from Ultravox API and store in database
    """
    try:
        logger.info(f"Fetching transcription for call ID: {call_id}")

        # First check if we have this transcription cached in the database
        db_session = get_db_session()
        call_log = db_session.query(CallLog).filter_by(ultravox_id=call_id).first()

        # If we have the transcription cached and it's not requested to refresh
        if call_log and call_log.transcription and not request.args.get('refresh'):
            logger.info(f"Using cached transcription for call ID: {call_id}")
            transcription_data = json.loads(call_log.transcription)

            return jsonify({
                "status": "success",
                "results": transcription_data.get("results", []),
                "total": transcription_data.get("total", 0),
                "next": transcription_data.get("next"),
                "previous": transcription_data.get("previous"),
                "source": "cache"
            })

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

        # Cache the transcription in the database if we have a call_log record
        if call_log:
            call_log.transcription = json.dumps(data)
            db_session.commit()
            logger.info(f"Cached transcription for call ID: {call_id}")

        # Return the transcription data
        return jsonify({
            "status": "success",
            "results": data.get("results", []),
            "total": data.get("total", 0),
            "next": data.get("next"),
            "previous": data.get("previous"),
            "source": "api"
        })

    except Exception as e:
        logger.error(f"Error in get_call_transcription: {str(e)}")
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


@analysis.route('/call_recording/<call_id>', methods=['GET'])
def get_call_recording(call_id):
    """
    Fetch call recording URL from Ultravox API and store in database
    """
    try:
        logger.info(f"Fetching recording URL for call ID: {call_id}")

        # First check if we have this recording URL cached in the database
        db_session = get_db_session()
        call_log = db_session.query(CallLog).filter_by(ultravox_id=call_id).first()

        # If we have the recording URL cached and it's not requested to refresh
        if call_log and call_log.recording_url and not request.args.get('refresh'):
            logger.info(f"Using cached recording URL for call ID: {call_id}")

            return jsonify({
                "status": "success",
                "url": call_log.recording_url,
                "source": "cache"
            })

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

            # Cache the recording URL in the database if we have a call_log record
            if call_log:
                call_log.recording_url = recording_url
                db_session.commit()
                logger.info(f"Cached recording URL for call ID: {call_id}")

            return jsonify({
                "status": "success",
                "url": recording_url,
                "source": "api"
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


@analysis.route('/call_analytics/<call_id>/<call_uuid>', methods=['GET'])
def get_call_analytics(call_id, call_uuid):
    """
    Fetch and combine analytics data from both Ultravox and Plivo
    Updated to work with new database schema
    """
    try:
        logger.info(f"Fetching analytics for call ID: {call_id}, call UUID: {call_uuid}")

        # First check if we have this analytics data cached
        db_session = get_db_session()
        call_log = db_session.query(CallLog).filter_by(ultravox_id=call_id, call_uuid=call_uuid).first()

        # If call doesn't exist in our DB by Ultravox ID, try by call UUID
        if not call_log:
            call_log = db_session.query(CallLog).filter_by(call_uuid=call_uuid).first()

        # And if that doesn't work, try by Ultravox ID only
        if not call_log:
            call_log = db_session.query(CallLog).filter_by(ultravox_id=call_id).first()

        analytics_data = {
            "ultravox": None,
            "plivo": None,
            "combined": {}
        }

        # Check if we should use cached data or refresh
        use_cache = not request.args.get('refresh') and call_log
        fetch_ultravox = True
        fetch_plivo = True

        # If we have plivo_data and ultravox_data cached and not requested to refresh
        if use_cache:
            if call_log.plivo_data:
                try:
                    analytics_data["plivo"] = json.loads(call_log.plivo_data)
                    fetch_plivo = False
                    logger.info(f"Using cached Plivo data for call UUID: {call_uuid}")
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in cached Plivo data for call UUID: {call_uuid}")

            if call_log.ultravox_data:
                try:
                    analytics_data["ultravox"] = json.loads(call_log.ultravox_data)
                    fetch_ultravox = False
                    logger.info(f"Using cached Ultravox data for call ID: {call_id}")
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in cached Ultravox data for call ID: {call_id}")

        # Fetch Ultravox call details if needed
        if fetch_ultravox:
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

                    # Cache the Ultravox data in the database
                    if call_log:
                        call_log.ultravox_data = json.dumps(ultravox_data)
                        # Also cache summary separately for easy access
                        call_log.summary = ultravox_data.get("summary")
                        db_session.commit()
                        logger.info(f"Cached Ultravox data for call ID: {call_id}")
            except Exception as e:
                logger.error(f"Error fetching Ultravox data: {str(e)}")
                logger.error(traceback.format_exc())

        # Fetch Plivo call details if needed
        if fetch_plivo:
            try:
                plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

                # Try to get call details from completed calls first
                try:
                    call_details = plivo_client.calls.get(call_uuid)

                    # Convert Plivo response to dict
                    plivo_data = {}
                    for attr in dir(call_details):
                        if not attr.startswith('_') and not callable(getattr(call_details, attr)):
                            plivo_data[attr] = getattr(call_details, attr)

                    analytics_data["plivo"] = plivo_data

                    # Cache the Plivo data in the database
                    if call_log:
                        call_log.plivo_data = json.dumps(plivo_data)

                        # Update other fields for easy access
                        call_log.call_state = call_details.call_state if hasattr(call_details, 'call_state') else None
                        call_log.call_duration = call_details.call_duration if hasattr(call_details,
                                                                                       'call_duration') else None

                        # Convert timestamps if available
                        if hasattr(call_details, 'end_time') and call_details.end_time:
                            try:
                                call_log.end_time = datetime.strptime(call_details.end_time, '%Y-%m-%d %H:%M:%S%z')
                            except ValueError:
                                logger.warning(f"Could not parse end_time: {call_details.end_time}")

                        if hasattr(call_details, 'answer_time') and call_details.answer_time:
                            try:
                                call_log.answer_time = datetime.strptime(call_details.answer_time,
                                                                         '%Y-%m-%d %H:%M:%S%z')
                            except ValueError:
                                logger.warning(f"Could not parse answer_time: {call_details.answer_time}")

                        if hasattr(call_details, 'initiation_time') and call_details.initiation_time:
                            try:
                                call_log.initiation_time = datetime.strptime(call_details.initiation_time,
                                                                             '%Y-%m-%d %H:%M:%S%z')
                            except ValueError:
                                logger.warning(f"Could not parse initiation_time: {call_details.initiation_time}")

                        call_log.hangup_cause = call_details.hangup_cause_name if hasattr(call_details,
                                                                                          'hangup_cause_name') else None
                        call_log.hangup_source = call_details.hangup_source if hasattr(call_details,
                                                                                       'hangup_source') else None

                        db_session.commit()
                        logger.info(f"Cached Plivo data for call UUID: {call_uuid}")

                except plivo.exceptions.ResourceNotFoundError:
                    logger.info(f"Call {call_uuid} not found in completed calls, checking live calls")

                    # If not found, try to get from live calls
                    try:
                        live_call = plivo_client.live_calls.get(call_uuid)

                        # Convert Plivo response to dict
                        plivo_data = {}
                        for attr in dir(live_call):
                            if not attr.startswith('_') and not callable(getattr(live_call, attr)):
                                plivo_data[attr] = getattr(live_call, attr)

                        analytics_data["plivo"] = plivo_data

                        # Cache the Plivo data in the database
                        if call_log:
                            call_log.plivo_data = json.dumps(plivo_data)
                            db_session.commit()
                            logger.info(f"Cached live Plivo data for call UUID: {call_uuid}")

                    except plivo.exceptions.ResourceNotFoundError:
                        logger.warning(f"Call {call_uuid} not found in live calls either")
            except Exception as e:
                logger.error(f"Error fetching Plivo data: {str(e)}")
                logger.error(traceback.format_exc())

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
            try:
                plivo_duration = int(analytics_data["plivo"]["call_duration"])
            except (ValueError, TypeError):
                logger.warning(f"Invalid call_duration value: {analytics_data['plivo']['call_duration']}")

        # Use the longer duration as the total
        combined_stats["total_duration"] = max(ultravox_duration, plivo_duration)

        # Add combined stats
        analytics_data["combined"] = combined_stats

        # Store analytics in CallAnalytics if we have a call_log record
        if call_log and call_log.id:
            try:
                # Check if analytics record exists
                analytics_record = db_session.query(CallAnalytics).filter_by(call_id=call_log.id).first()

                if not analytics_record:
                    # Calculate additional metrics if possible
                    total_messages = 0
                    agent_messages = 0
                    user_messages = 0
                    agent_response_length = 0
                    user_response_length = 0

                    if call_log.transcription:
                        try:
                            transcription_data = json.loads(call_log.transcription)
                            messages = transcription_data.get("results", [])

                            # Count messages by role
                            total_messages = len(messages)
                            agent_messages = sum(
                                1 for msg in messages if msg.get("role") in ["MESSAGE_ROLE_AGENT", "assistant"])
                            user_messages = sum(
                                1 for msg in messages if msg.get("role") in ["MESSAGE_ROLE_USER", "user"])

                            # Calculate average response length
                            agent_texts = [msg.get("text", "") for msg in messages if
                                           msg.get("role") in ["MESSAGE_ROLE_AGENT", "assistant"] and msg.get("text")]
                            user_texts = [msg.get("text", "") for msg in messages if
                                          msg.get("role") in ["MESSAGE_ROLE_USER", "user"] and msg.get("text")]

                            if agent_texts:
                                agent_response_length = sum(len(text) for text in agent_texts) // len(agent_texts)

                            if user_texts:
                                user_response_length = sum(len(text) for text in user_texts) // len(user_texts)
                        except Exception as e:
                            logger.warning(f"Error calculating message statistics: {str(e)}")

                    # Create new analytics record
                    new_analytics = CallAnalytics(
                        call_id=call_log.id,
                        total_duration=combined_stats.get("total_duration"),
                        total_messages=total_messages,
                        agent_messages=agent_messages,
                        user_messages=user_messages,
                        avg_agent_response_length=agent_response_length,
                        avg_user_response_length=user_response_length,
                        call_success=True if call_log.call_state == 'ANSWER' else False
                    )

                    db_session.add(new_analytics)
                    db_session.commit()
                    logger.info(f"Created analytics record for call ID: {call_log.id}")
                else:
                    # Update existing record
                    analytics_record.total_duration = combined_stats.get("total_duration")
                    db_session.commit()
                    logger.info(f"Updated analytics record for call ID: {call_log.id}")
            except Exception as e:
                logger.error(f"Error storing call analytics: {str(e)}")
                logger.error(traceback.format_exc())

        # Return the combined analytics data
        return jsonify({
            "status": "success",
            "analytics": analytics_data
        })

    except Exception as e:
        logger.error(f"Error in get_call_analytics: {str(e)}")
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


@analysis.route('/analyze_transcript/<call_id>', methods=['GET'])
def analyze_transcript(call_id):
    """
    Analyze a call transcript using OpenAI and store results
    """
    try:
        logger.info(f"Analyzing transcript for call ID: {call_id}")

        # Check if OpenAI API key is configured
        openai_api_key = current_app.config.get('OPENAI_API_KEY') or os.environ.get('OPENAI_API_KEY')
        if not openai_api_key:
            return jsonify({
                "status": "error",
                "message": "OpenAI API key not configured"
            }), 500

        # Get the call transcript
        db_session = get_db_session()
        call_log = db_session.query(CallLog).filter_by(ultravox_id=call_id).first()

        if not call_log:
            return jsonify({
                "status": "error",
                "message": f"Call with ID {call_id} not found"
            }), 404

        # Check if we have a transcription
        if not call_log.transcription:
            # Try to fetch it
            api_url = f"{ULTRAVOX_API_BASE_URL}/calls/{call_id}/messages"
            headers = {
                'Content-Type': 'application/json',
                'X-API-Key': ULTRAVOX_API_KEY
            }

            response = requests.get(api_url, headers=headers)

            if response.status_code != 200:
                return jsonify({
                    "status": "error",
                    "message": "No transcript available for this call"
                }), 404

            # Parse the response
            data = response.json()
            call_log.transcription = json.dumps(data)
            db_session.commit()

        # Parse the transcript
        try:
            transcript_data = json.loads(call_log.transcription)
            messages = transcript_data.get("results", [])

            if not messages:
                return jsonify({
                    "status": "error",
                    "message": "No messages found in transcript"
                }), 404

            # Format the transcript for analysis
            formatted_transcript = ""
            for msg in messages:
                role = "Agent" if msg.get("role") in ["MESSAGE_ROLE_AGENT", "assistant"] else "Customer"
                text = msg.get("text", "")
                if text:
                    formatted_transcript += f"{role}: {text}\n\n"

            # Get existing analytics
            analytics_record = None
            if call_log.id:
                analytics_record = db_session.query(CallAnalytics).filter_by(call_id=call_log.id).first()

            # Check if we already have entity analysis
            if analytics_record and analytics_record.entities_extracted and not request.args.get('refresh'):
                logger.info(f"Using cached entity analysis for call ID: {call_id}")
                entities = json.loads(analytics_record.entities_extracted)

                return jsonify({
                    "status": "success",
                    "analysis": entities,
                    "source": "cache"
                })

            # Use OpenAI to analyze the transcript
            client = openai.OpenAI(api_key=openai_api_key)

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": """You are an expert at analyzing call transcripts. 
                    Extract key information from this conversation between an Agent and a Customer.
                    Return the results as a JSON object with the following fields:
                    - customer_name: Extracted customer name, or null if not mentioned
                    - contact_details: Extracted phone number or email, or null if not mentioned
                    - topics: List of main topics discussed
                    - products_mentioned: List of products or services mentioned
                    - customer_needs: List of customer needs or pain points expressed
                    - sentiment: Overall customer sentiment (positive, neutral, negative, mixed)
                    - financial_figures: Any prices, costs, budgets mentioned
                    - follow_up_actions: List of required follow-up actions

                    Follow these rules:
                    - Use null for fields where no information is available
                    - Be concise and direct in your extraction
                    - Format as valid JSON only, without explanation
                    - Only include information explicitly mentioned in the transcript"""},
                    {"role": "user", "content": formatted_transcript}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            # Parse the response
            analysis_result = response.choices[0].message.content
            entity_data = json.loads(analysis_result)

            # Store the results in the database
            if analytics_record:
                analytics_record.entities_extracted = analysis_result
                db_session.commit()
                logger.info(f"Cached entity analysis for call ID: {call_id}")
            elif call_log.id:
                # Create a new analytics record
                new_analytics = CallAnalytics(
                    call_id=call_log.id,
                    entities_extracted=analysis_result
                )
                db_session.add(new_analytics)
                db_session.commit()
                logger.info(f"Created analytics record with entity analysis for call ID: {call_log.id}")

            return jsonify({
                "status": "success",
                "analysis": entity_data,
                "source": "api"
            })

        except json.JSONDecodeError:
            return jsonify({
                "status": "error",
                "message": "Invalid JSON in transcript data"
            }), 500
    except Exception as e:
        logger.error(f"Error in analyze_transcript: {str(e)}")
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