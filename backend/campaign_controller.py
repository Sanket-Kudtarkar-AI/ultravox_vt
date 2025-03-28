import json
import logging
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from models import Campaign, Agent, CampaignContact, CallLog
from database import get_db_session, close_db_session, get_db_session_with_retry
from config import setup_logging
from datetime import datetime

# Set up logging
logger = setup_logging("campaign_controller", "campaign_controller.log")

# Create a Blueprint for campaign API routes
campaign = Blueprint('campaign', __name__)


@campaign.route('/campaigns', methods=['GET'])
def get_campaigns():
    """
    Get all campaigns
    """
    try:
        db_session = get_db_session_with_retry()
        campaigns = db_session.query(Campaign).all()

        return jsonify({
            "status": "success",
            "campaigns": [campaign.to_dict() for campaign in campaigns]
        })
    except Exception as e:
        logger.error(f"Error in get_campaigns: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    """
    Get a specific campaign by ID
    """
    try:
        db_session = get_db_session_with_retry()
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()

        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        # Get campaign statistics
        total_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(campaign_id=campaign_id).scalar()
        completed_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id,
            status='completed'
        ).scalar()
        failed_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id,
            status='failed'
        ).scalar()
        pending_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id,
            status='pending'
        ).scalar()

        campaign_data = campaign.to_dict()
        campaign_data['statistics'] = {
            'total_contacts': total_contacts,
            'completed_contacts': completed_contacts,
            'failed_contacts': failed_contacts,
            'pending_contacts': pending_contacts,
            'completion_percentage': round((completed_contacts / total_contacts) * 100, 2) if total_contacts > 0 else 0
        }

        return jsonify({
            "status": "success",
            "campaign": campaign_data
        })
    except Exception as e:
        logger.error(f"Error in get_campaign: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns', methods=['POST'])
def create_campaign():
    """
    Create a new campaign
    """
    try:
        data = request.json
        logger.info(f"Received create campaign request: {data}")

        # Validate required fields
        required_fields = ["campaign_name", "assigned_agent_id", "from_number"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }), 400

        db_session = get_db_session_with_retry()

        # Verify agent exists
        agent = db_session.query(Agent).filter_by(agent_id=data["assigned_agent_id"]).first()
        if not agent:
            return jsonify({
                "status": "error",
                "message": f"Agent with ID {data['assigned_agent_id']} not found"
            }), 404

        # Create new campaign
        new_campaign = Campaign(
            campaign_name=data["campaign_name"],
            assigned_agent_id=data["assigned_agent_id"],
            assigned_agent_name=agent.name,
            from_number=data["from_number"],
            schedule_date=datetime.fromisoformat(data["schedule_date"]) if data.get("schedule_date") else None,
            status=data.get("status", "created"),
            file_name=data.get("file_name"),
            config=json.dumps(data.get("config", {}))
        )

        db_session.add(new_campaign)
        db_session.commit()

        # Need to refresh to get the auto-generated ID
        db_session.refresh(new_campaign)

        logger.info(f"Created campaign: {new_campaign.campaign_id}")

        return jsonify({
            "status": "success",
            "message": "Campaign created successfully",
            "campaign": new_campaign.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Error in create_campaign: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>', methods=['PUT'])
def update_campaign(campaign_id):
    """
    Update an existing campaign
    """
    try:
        data = request.json
        logger.info(f"Received update campaign request for {campaign_id}: {data}")

        db_session = get_db_session_with_retry()

        # Check if campaign exists
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        # Update fields
        if "campaign_name" in data:
            campaign.campaign_name = data["campaign_name"]

        if "assigned_agent_id" in data:
            # Verify agent exists
            agent = db_session.query(Agent).filter_by(agent_id=data["assigned_agent_id"]).first()
            if not agent:
                return jsonify({
                    "status": "error",
                    "message": f"Agent with ID {data['assigned_agent_id']} not found"
                }), 404

            campaign.assigned_agent_id = data["assigned_agent_id"]
            campaign.assigned_agent_name = agent.name

        if "from_number" in data:
            campaign.from_number = data["from_number"]

        if "schedule_date" in data:
            campaign.schedule_date = datetime.fromisoformat(data["schedule_date"]) if data["schedule_date"] else None

        if "status" in data:
            campaign.status = data["status"]

        if "file_name" in data:
            campaign.file_name = data["file_name"]

        if "config" in data:
            campaign.config = json.dumps(data["config"])

        if "total_contacts" in data:
            campaign.total_contacts = data["total_contacts"]

        # Update the record
        campaign.updated_at = datetime.now()
        db_session.commit()

        logger.info(f"Updated campaign: {campaign_id}")

        return jsonify({
            "status": "success",
            "message": "Campaign updated successfully",
            "campaign": campaign.to_dict()
        })

    except Exception as e:
        logger.error(f"Error in update_campaign: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>', methods=['DELETE'])
def delete_campaign(campaign_id):
    """
    Delete a campaign
    """
    try:
        db_session = get_db_session_with_retry()

        # Check if campaign exists
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        # Delete all campaign contacts first
        db_session.query(CampaignContact).filter_by(campaign_id=campaign_id).delete()

        # Update call logs to remove campaign reference
        calls = db_session.query(CallLog).filter_by(campaign_id=campaign_id).all()
        for call in calls:
            call.campaign_id = None

        # Delete the campaign
        db_session.delete(campaign)
        db_session.commit()

        logger.info(f"Deleted campaign: {campaign_id}")

        return jsonify({
            "status": "success",
            "message": "Campaign deleted successfully"
        })

    except Exception as e:
        logger.error(f"Error in delete_campaign: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>/status', methods=['PUT'])
def update_campaign_status(campaign_id):
    """
    Update a campaign's status
    """
    try:
        data = request.json

        if "status" not in data:
            return jsonify({
                "status": "error",
                "message": "Missing required field: status"
            }), 400

        db_session = get_db_session_with_retry()

        # Check if campaign exists
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        # Validate status
        valid_statuses = ["created", "running", "paused", "completed"]
        if data["status"] not in valid_statuses:
            return jsonify({
                "status": "error",
                "message": f"Invalid status: {data['status']}. Must be one of {valid_statuses}"
            }), 400

        # Update status
        campaign.status = data["status"]
        campaign.updated_at = datetime.now()
        db_session.commit()

        logger.info(f"Updated campaign status: {campaign_id} -> {data['status']}")

        return jsonify({
            "status": "success",
            "message": "Campaign status updated successfully",
            "campaign": campaign.to_dict()
        })

    except Exception as e:
        logger.error(f"Error in update_campaign_status: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>/contacts', methods=['GET'])
def get_campaign_contacts(campaign_id):
    """
    Get all contacts for a campaign
    """
    try:
        db_session = get_db_session_with_retry()

        # Check if campaign exists
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        # Get contacts
        contacts = db_session.query(CampaignContact).filter_by(campaign_id=campaign_id).all()

        return jsonify({
            "status": "success",
            "campaign_id": campaign_id,
            "campaign_name": campaign.campaign_name,
            "contacts": [contact.to_dict() for contact in contacts]
        })

    except Exception as e:
        logger.error(f"Error in get_campaign_contacts: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>/contacts', methods=['POST'])
def add_campaign_contacts(campaign_id):
    """
    Add contacts to a campaign
    """
    try:
        data = request.json

        if not isinstance(data, list):
            return jsonify({
                "status": "error",
                "message": "Expected a JSON array of contacts"
            }), 400

        db_session = get_db_session_with_retry()

        # Check if campaign exists
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        added_contacts = []
        for contact_data in data:
            # Skip if missing required phone
            if not contact_data.get("phone"):
                continue

            # Normalize phone number
            phone = contact_data["phone"]
            if not phone.startswith('+'):
                phone = '+' + phone

            # Create new contact
            new_contact = CampaignContact(
                campaign_id=campaign_id,
                name=contact_data.get("name", ""),
                phone=phone,
                status=contact_data.get("status", "pending"),
                additional_data=json.dumps(contact_data.get("additional_data", {}))
            )

            db_session.add(new_contact)
            added_contacts.append({
                "name": new_contact.name,
                "phone": new_contact.phone,
                "status": new_contact.status
            })

        # Update total contacts count
        current_count = db_session.query(func.count(CampaignContact.id)).filter_by(campaign_id=campaign_id).scalar()
        campaign.total_contacts = current_count

        db_session.commit()

        logger.info(f"Added {len(added_contacts)} contacts to campaign {campaign_id}")

        return jsonify({
            "status": "success",
            "message": f"Successfully added {len(added_contacts)} contacts",
            "contacts": added_contacts
        })

    except Exception as e:
        logger.error(f"Error in add_campaign_contacts: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>/contacts/<int:contact_id>', methods=['PUT'])
def update_campaign_contact(campaign_id, contact_id):
    """
    Update a campaign contact
    """
    try:
        data = request.json

        db_session = get_db_session_with_retry()

        # Check if contact exists and belongs to the campaign
        contact = db_session.query(CampaignContact).filter_by(
            id=contact_id,
            campaign_id=campaign_id
        ).first()

        if not contact:
            return jsonify({
                "status": "error",
                "message": f"Contact with ID {contact_id} not found in campaign {campaign_id}"
            }), 404

        # Update fields
        if "name" in data:
            contact.name = data["name"]

        if "phone" in data:
            # Normalize phone number
            phone = data["phone"]
            if not phone.startswith('+'):
                phone = '+' + phone

            contact.phone = phone

        if "status" in data:
            contact.status = data["status"]

        if "call_uuid" in data:
            contact.call_uuid = data["call_uuid"]

        if "additional_data" in data:
            contact.additional_data = json.dumps(data["additional_data"])

        contact.updated_at = datetime.now()
        db_session.commit()

        logger.info(f"Updated contact {contact_id} in campaign {campaign_id}")

        return jsonify({
            "status": "success",
            "message": "Contact updated successfully",
            "contact": contact.to_dict()
        })

    except Exception as e:
        logger.error(f"Error in update_campaign_contact: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>/contacts/<int:contact_id>', methods=['DELETE'])
def delete_campaign_contact(campaign_id, contact_id):
    """
    Delete a campaign contact
    """
    try:
        db_session = get_db_session_with_retry()

        # Check if contact exists and belongs to the campaign
        contact = db_session.query(CampaignContact).filter_by(
            id=contact_id,
            campaign_id=campaign_id
        ).first()

        if not contact:
            return jsonify({
                "status": "error",
                "message": f"Contact with ID {contact_id} not found in campaign {campaign_id}"
            }), 404

        # Delete the contact
        db_session.delete(contact)

        # Update total contacts count
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if campaign:
            current_count = db_session.query(func.count(CampaignContact.id)).filter_by(campaign_id=campaign_id).scalar()
            campaign.total_contacts = current_count

        db_session.commit()

        logger.info(f"Deleted contact {contact_id} from campaign {campaign_id}")

        return jsonify({
            "status": "success",
            "message": "Contact deleted successfully"
        })

    except Exception as e:
        logger.error(f"Error in delete_campaign_contact: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>/schedule', methods=['POST'])
def schedule_campaign(campaign_id):
    """
    Schedule a campaign to run at a specific time
    """
    try:
        data = request.json

        if "schedule_date" not in data:
            return jsonify({
                "status": "error",
                "message": "Missing required field: schedule_date"
            }), 400

        db_session = get_db_session_with_retry()

        # Check if campaign exists
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        # Parse the schedule date
        try:
            schedule_date = datetime.fromisoformat(data["schedule_date"])
        except ValueError:
            return jsonify({
                "status": "error",
                "message": "Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
            }), 400

        # Update the campaign
        campaign.schedule_date = schedule_date
        campaign.status = "scheduled"
        campaign.updated_at = datetime.now()
        db_session.commit()

        logger.info(f"Scheduled campaign {campaign_id} for {schedule_date}")

        return jsonify({
            "status": "success",
            "message": "Campaign scheduled successfully",
            "campaign": campaign.to_dict()
        })

    except Exception as e:
        logger.error(f"Error in schedule_campaign: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>/next-contact', methods=['GET'])
def get_next_campaign_contact(campaign_id):
    """
    Get the next pending contact for a campaign
    """
    try:
        db_session = get_db_session_with_retry()

        # Check if campaign exists
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        # Ensure campaign is running
        if campaign.status != "running":
            return jsonify({
                "status": "error",
                "message": f"Campaign is not running (current status: {campaign.status})"
            }), 400

        # Get next pending contact
        next_contact = db_session.query(CampaignContact).filter_by(
            campaign_id=campaign_id,
            status="pending"
        ).order_by(CampaignContact.id).first()

        if not next_contact:
            # No more pending contacts, mark campaign as completed
            campaign.status = "completed"
            db_session.commit()

            return jsonify({
                "status": "success",
                "message": "No more pending contacts, campaign marked as completed",
                "contact": None
            })

        return jsonify({
            "status": "success",
            "contact": next_contact.to_dict()
        })

    except Exception as e:
        logger.error(f"Error in get_next_campaign_contact: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@campaign.route('/campaigns/<int:campaign_id>/stats', methods=['GET'])
def get_campaign_stats(campaign_id):
    """
    Get statistics for a campaign
    """
    try:
        db_session = get_db_session_with_retry()

        # Check if campaign exists
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            return jsonify({
                "status": "error",
                "message": f"Campaign with ID {campaign_id} not found"
            }), 404

        # Get campaign statistics
        total_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id
        ).scalar()

        completed_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id,
            status='completed'
        ).scalar()

        failed_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id,
            status='failed'
        ).scalar()

        no_answer_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id,
            status='no-answer'
        ).scalar()

        pending_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id,
            status='pending'
        ).scalar()

        calling_contacts = db_session.query(func.count(CampaignContact.id)).filter_by(
            campaign_id=campaign_id,
            status='calling'
        ).scalar()

        # Calculate completion rate
        completion_rate = 0
        if total_contacts > 0:
            completion_rate = round(
                ((completed_contacts + failed_contacts + no_answer_contacts) / total_contacts) * 100, 2)

        # Calculate success rate
        success_rate = 0
        if (completed_contacts + failed_contacts + no_answer_contacts) > 0:
            success_rate = round(
                (completed_contacts / (completed_contacts + failed_contacts + no_answer_contacts)) * 100, 2)

        # Get associated calls
        calls = db_session.query(CallLog).filter_by(campaign_id=campaign_id).all()

        # Calculate average call duration
        total_duration = 0
        call_count = 0

        for call in calls:
            if call.call_duration:
                total_duration += call.call_duration
                call_count += 1

        avg_duration = 0
        if call_count > 0:
            avg_duration = round(total_duration / call_count, 2)

        stats = {
            "campaign_id": campaign_id,
            "campaign_name": campaign.campaign_name,
            "status": campaign.status,
            "total_contacts": total_contacts,
            "completed_contacts": completed_contacts,
            "failed_contacts": failed_contacts,
            "no_answer_contacts": no_answer_contacts,
            "pending_contacts": pending_contacts,
            "calling_contacts": calling_contacts,
            "completion_rate": completion_rate,
            "success_rate": success_rate,
            "total_calls": call_count,
            "average_call_duration": avg_duration,
            "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
            "updated_at": campaign.updated_at.isoformat() if campaign.updated_at else None,
            "schedule_date": campaign.schedule_date.isoformat() if campaign.schedule_date else None
        }

        return jsonify({
            "status": "success",
            "statistics": stats
        })

    except Exception as e:
        logger.error(f"Error in get_campaign_stats: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)