import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from models import SavedPhoneNumber
from database import get_db_session, close_db_session
from config import setup_logging

# Set up logging
logger = setup_logging("phone_controller", "phone_controller.log")

# Create a Blueprint for phone number API routes
phone = Blueprint('phone', __name__)


@phone.route('/phone-numbers', methods=['GET'])
def get_phone_numbers():
    """
    Get all saved phone numbers, optionally filtered by type
    """
    try:
        number_type = request.args.get('type')

        db_session = get_db_session()
        query = db_session.query(SavedPhoneNumber)

        if number_type:
            query = query.filter_by(number_type=number_type)

        # Order by last used (most recent first)
        query = query.order_by(SavedPhoneNumber.last_used.desc())

        phone_numbers = query.all()

        return jsonify({
            "status": "success",
            "phone_numbers": [number.to_dict() for number in phone_numbers]
        })
    except Exception as e:
        logger.error(f"Error in get_phone_numbers: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@phone.route('/phone-numbers/<int:number_id>', methods=['GET'])
def get_phone_number(number_id):
    """
    Get a specific phone number by ID
    """
    try:
        db_session = get_db_session()
        phone_number = db_session.query(SavedPhoneNumber).filter_by(id=number_id).first()

        if not phone_number:
            return jsonify({
                "status": "error",
                "message": f"Phone number with ID {number_id} not found"
            }), 404

        return jsonify({
            "status": "success",
            "phone_number": phone_number.to_dict()
        })
    except Exception as e:
        logger.error(f"Error in get_phone_number: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@phone.route('/phone-numbers', methods=['POST'])
def save_phone_number():
    """
    Save a new phone number
    """
    try:
        data = request.json
        logger.info(f"Received save phone number request: {data}")

        # Validate required fields
        if not data.get("phone_number"):
            return jsonify({
                "status": "error",
                "message": "Missing required field: phone_number"
            }), 400

        if not data.get("number_type"):
            return jsonify({
                "status": "error",
                "message": "Missing required field: number_type"
            }), 400

        # Normalize the phone number (ensure it has + prefix)
        phone_number = data["phone_number"]
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number

        db_session = get_db_session()

        # Check if number already exists
        existing_number = db_session.query(SavedPhoneNumber).filter_by(
            phone_number=phone_number
        ).first()

        if existing_number:
            # Update last_used timestamp
            existing_number.last_used = datetime.now()

            # Update label if provided
            if data.get("label"):
                existing_number.label = data["label"]

            db_session.commit()

            logger.info(f"Updated existing phone number: {phone_number}")

            return jsonify({
                "status": "success",
                "message": "Phone number updated successfully",
                "phone_number": existing_number.to_dict()
            })

        # Create new saved phone number
        new_number = SavedPhoneNumber(
            phone_number=phone_number,
            label=data.get("label"),
            number_type=data["number_type"],
            last_used=datetime.now()
        )

        db_session.add(new_number)
        db_session.commit()

        logger.info(f"Saved new phone number: {phone_number}")

        return jsonify({
            "status": "success",
            "message": "Phone number saved successfully",
            "phone_number": new_number.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Error in save_phone_number: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@phone.route('/phone-numbers/<int:number_id>', methods=['PUT'])
def update_phone_number(number_id):
    """
    Update an existing phone number
    """
    try:
        data = request.json
        logger.info(f"Received update phone number request for {number_id}: {data}")

        db_session = get_db_session()

        # Check if phone number exists
        phone_number = db_session.query(SavedPhoneNumber).filter_by(id=number_id).first()
        if not phone_number:
            return jsonify({
                "status": "error",
                "message": f"Phone number with ID {number_id} not found"
            }), 404

        # Update fields
        if "phone_number" in data:
            # Normalize the phone number
            new_number = data["phone_number"]
            if not new_number.startswith('+'):
                new_number = '+' + new_number

            phone_number.phone_number = new_number

        if "label" in data:
            phone_number.label = data["label"]

        if "number_type" in data:
            phone_number.number_type = data["number_type"]

        # Always update last_used when modified
        phone_number.last_used = datetime.now()

        db_session.commit()

        logger.info(f"Updated phone number: {number_id}")

        return jsonify({
            "status": "success",
            "message": "Phone number updated successfully",
            "phone_number": phone_number.to_dict()
        })

    except Exception as e:
        logger.error(f"Error in update_phone_number: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@phone.route('/phone-numbers/<int:number_id>', methods=['DELETE'])
def delete_phone_number(number_id):
    """
    Delete a phone number
    """
    try:
        db_session = get_db_session()

        # Check if phone number exists
        phone_number = db_session.query(SavedPhoneNumber).filter_by(id=number_id).first()
        if not phone_number:
            return jsonify({
                "status": "error",
                "message": f"Phone number with ID {number_id} not found"
            }), 404

        # Delete the number
        db_session.delete(phone_number)
        db_session.commit()

        logger.info(f"Deleted phone number: {number_id}")

        return jsonify({
            "status": "success",
            "message": "Phone number deleted successfully"
        })

    except Exception as e:
        logger.error(f"Error in delete_phone_number: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@phone.route('/phone-numbers/by-number/<phone_number>', methods=['GET'])
def get_phone_number_by_number(phone_number):
    """
    Get a phone number by its actual number
    """
    try:
        # Normalize the phone number
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number

        db_session = get_db_session()
        saved_number = db_session.query(SavedPhoneNumber).filter_by(phone_number=phone_number).first()

        if not saved_number:
            return jsonify({
                "status": "error",
                "message": f"Phone number {phone_number} not found"
            }), 404

        return jsonify({
            "status": "success",
            "phone_number": saved_number.to_dict()
        })
    except Exception as e:
        logger.error(f"Error in get_phone_number_by_number: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@phone.route('/phone-numbers/update-usage', methods=['POST'])
def update_number_usage():
    """
    Update the last_used timestamp for a phone number
    """
    try:
        data = request.json

        if not data.get("phone_number"):
            return jsonify({
                "status": "error",
                "message": "Missing required field: phone_number"
            }), 400

        # Normalize the phone number
        phone_number = data["phone_number"]
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number

        db_session = get_db_session()

        # Check if number exists
        saved_number = db_session.query(SavedPhoneNumber).filter_by(phone_number=phone_number).first()

        if not saved_number:
            return jsonify({
                "status": "error",
                "message": f"Phone number {phone_number} not found"
            }), 404

        # Update last_used timestamp
        saved_number.last_used = datetime.now()
        db_session.commit()

        return jsonify({
            "status": "success",
            "message": "Phone number usage updated successfully",
            "phone_number": saved_number.to_dict()
        })

    except Exception as e:
        logger.error(f"Error in update_number_usage: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@phone.route('/phone-numbers/bulk-import', methods=['POST'])
def bulk_import_phone_numbers():
    """
    Import multiple phone numbers from a JSON array
    """
    try:
        data = request.json

        if not isinstance(data, list):
            return jsonify({
                "status": "error",
                "message": "Expected a JSON array of phone numbers"
            }), 400

        db_session = get_db_session()

        imported_numbers = []
        for number_data in data:
            # Skip if missing required fields
            if not number_data.get("phone_number") or not number_data.get("number_type"):
                continue

            # Normalize the phone number
            phone_number = number_data["phone_number"]
            if not phone_number.startswith('+'):
                phone_number = '+' + phone_number

            # Check if number already exists
            existing_number = db_session.query(SavedPhoneNumber).filter_by(
                phone_number=phone_number
            ).first()

            if existing_number:
                # Update existing number
                existing_number.last_used = datetime.now()
                if number_data.get("label"):
                    existing_number.label = number_data["label"]

                imported_numbers.append(existing_number.to_dict())
            else:
                # Create new number
                new_number = SavedPhoneNumber(
                    phone_number=phone_number,
                    label=number_data.get("label"),
                    number_type=number_data["number_type"],
                    last_used=datetime.now()
                )

                db_session.add(new_number)
                imported_numbers.append({
                    "phone_number": phone_number,
                    "label": number_data.get("label"),
                    "number_type": number_data["number_type"]
                })

        db_session.commit()

        logger.info(f"Bulk imported {len(imported_numbers)} phone numbers")

        return jsonify({
            "status": "success",
            "message": f"Successfully imported {len(imported_numbers)} phone numbers",
            "phone_numbers": imported_numbers
        })

    except Exception as e:
        logger.error(f"Error in bulk_import_phone_numbers: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)