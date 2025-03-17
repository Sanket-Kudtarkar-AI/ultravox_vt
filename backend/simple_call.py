import plivo
import logging
import urllib.parse
import json
import time
from datetime import datetime

# Import from configuration
from config import (
    setup_logging,
    PLIVO_AUTH_ID,
    PLIVO_AUTH_TOKEN,
    PLIVO_PHONE_NUMBER,
    NGROK_URL,
    DEFAULT_RECIPIENT_NUMBER,
    SYSTEM_PROMPT,
    DEFAULT_VAD_SETTINGS
)

# Configure logging
logger = setup_logging("plivo_call", "../plivo_call.log")


def make_call(recipient_number=None):
    """
    Make a call using Plivo and Ultravox
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"=== Starting call process at {timestamp} ===")

    # Use default recipient if none provided
    if recipient_number is None:
        recipient_number = DEFAULT_RECIPIENT_NUMBER

    # Validate phone numbers and NGROK URL
    if not PLIVO_PHONE_NUMBER or PLIVO_PHONE_NUMBER == "+1xxxxxxxxxx":
        logger.error("Invalid Plivo phone number")
        print("ERROR: Please update the PLIVO_PHONE_NUMBER in the .env file")
        return None

    if not recipient_number or recipient_number == "+1xxxxxxxxxx":
        logger.error("Invalid recipient number")
        print("ERROR: Please provide a valid recipient number")
        return None

    if not NGROK_URL or NGROK_URL == "https://your-ngrok-url.ngrok-free.app":
        logger.error("Invalid NGROK_URL")
        print("ERROR: Please update the NGROK_URL in the .env file")
        return None

    # Initialize Plivo client
    logger.info(f"Initializing Plivo client with Auth ID: {PLIVO_AUTH_ID[:5]}*****")
    plivo_client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

    # Construct the answer URL - system prompt and VAD settings are now in config
    answer_url = f"{NGROK_URL}/answer_url"
    hangup_url = f"{NGROK_URL}/hangup_url"

    logger.info(f"Recipient number: {recipient_number}")
    logger.info(f"Plivo number: {PLIVO_PHONE_NUMBER}")
    logger.info(f"Answer URL: {answer_url}")
    logger.info(f"Hangup URL: {hangup_url}")

    try:
        logger.info("Initiating call...")
        call = plivo_client.calls.create(
            from_=PLIVO_PHONE_NUMBER,
            to_=recipient_number,
            answer_url=answer_url,
            hangup_url=hangup_url,
            answer_method='GET',
            hangup_method='POST'
        )

        # Log successful call initiation
        logger.info(f"Call initiated successfully!")
        logger.info(f"Call UUID: {call.request_uuid}")
        logger.info(f"Call details: {call}")

        print(f"\n✅ Call initiated successfully!")
        print(f"Call UUID: {call.request_uuid}")
        print(f"\nMonitoring call status for the next 60 seconds...")

        # Monitor call status for a while
        status_check_duration = 60  # seconds
        interval = 5  # check every 5 seconds
        end_time = time.time() + status_check_duration

        while time.time() < end_time:
            try:
                # Get call details
                call_details = plivo_client.calls.get(call.request_uuid)
                status = call_details.status
                logger.info(f"Current call status: {status}")
                print(f"Current call status: {status}")

                # If call is terminated, break out of the loop
                if status in ["completed", "busy", "failed", "no-answer"]:
                    logger.info(f"Call ended with status: {status}")
                    print(f"\n📞 Call ended with status: {status}")
                    break

                time.sleep(interval)
            except Exception as e:
                logger.warning(f"Error checking call status: {str(e)}")
                print(f"Warning: Error checking call status")
                time.sleep(interval)

        return call

    except Exception as e:
        logger.error(f"Error initiating call: {str(e)}")
        print(f"\n❌ Error initiating call: {str(e)}")
        return None


if __name__ == "__main__":
    print("\n=== Plivo Ultravox Call Initiator ===\n")
    print(f"Default recipient: {DEFAULT_RECIPIENT_NUMBER}")
    print(f"From: {PLIVO_PHONE_NUMBER}")
    print(f"Server: {NGROK_URL}")
    print(f"System prompt and VAD settings will be loaded from config.py")

    # Ask if the user wants to use a different recipient number
    use_different = input("\nUse default recipient number? (y/n): ").strip().lower()

    if use_different == 'n':
        recipient = input("Enter recipient number with country code (e.g., +918879415567): ").strip()
        print(f"\nStarting call to {recipient}...")
        make_call(recipient)
    else:
        print(f"\nStarting call to default recipient {DEFAULT_RECIPIENT_NUMBER}...")
        make_call()

    print("\nCheck 'plivo_call.log' for detailed logs.")