import requests
import json
import logging
from config import ULTRAVOX_API_BASE_URL, ULTRAVOX_API_KEY


def get_join_url(ultravox_payload):
    """
    This function calls the Ultravox API using the provided payload.
    It returns the joinUrl and call ID from the response.
    """
    # Get the logger that was set up in the main modules
    logger = logging.getLogger("plivo_server")

    logger.info(f"Getting joinUrl with payload: {json.dumps(ultravox_payload)}")

    api_url = f"{ULTRAVOX_API_BASE_URL}/calls?enableGreetingPrompt=true"
    payload = json.dumps(ultravox_payload)
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': ULTRAVOX_API_KEY
    }

    try:
        logger.info(f"Sending request to Ultravox API")
        response = requests.post(api_url, headers=headers, data=payload)

        # Accept both 200 and 201 as valid responses (201 means "Created")
        if response.status_code not in [200, 201]:
            error_msg = f"Error from Ultravox API: {response.status_code} - {response.text}"
            logger.error(error_msg)
            raise Exception(error_msg)

        data = response.json()
        join_url = data.get("joinUrl")
        call_id = data.get("callId", "unknown")

        logger.info(f"Received joinUrl: {join_url}")
        logger.info(f"Call ID: {call_id}")

        if not join_url:
            error_msg = "joinUrl not found in response"
            logger.error(error_msg)
            raise Exception(error_msg)

        return join_url, call_id
    except Exception as e:
        logger.error(f"Exception in get_join_url: {str(e)}")
        raise