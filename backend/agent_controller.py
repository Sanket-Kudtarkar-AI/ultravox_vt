import json
import logging
import uuid
from flask import Blueprint, request, jsonify
from models import Agent
from database import get_db_session, close_db_session
from config import setup_logging

# Set up logging
logger = setup_logging("agent_controller", "agent_controller.log")

# Create a Blueprint for agent API routes
agent = Blueprint('agent', __name__)


@agent.route('/agents', methods=['GET'])
def get_agents():
    """
    Get all agents
    """
    try:
        db_session = get_db_session()
        agents = db_session.query(Agent).all()

        return jsonify({
            "status": "success",
            "agents": [agent.to_dict() for agent in agents]
        })
    except Exception as e:
        logger.error(f"Error in get_agents: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@agent.route('/agents/<agent_id>', methods=['GET'])
def get_agent(agent_id):
    """
    Get a specific agent by ID
    """
    try:
        db_session = get_db_session()
        agent = db_session.query(Agent).filter_by(agent_id=agent_id).first()

        if not agent:
            return jsonify({
                "status": "error",
                "message": f"Agent with ID {agent_id} not found"
            }), 404

        return jsonify({
            "status": "success",
            "agent": agent.to_dict()
        })
    except Exception as e:
        logger.error(f"Error in get_agent: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@agent.route('/agents', methods=['POST'])
def create_agent():
    """
    Create a new agent
    """
    try:
        data = request.json
        logger.info(f"Received create agent request: {data}")

        # Validate required fields
        required_fields = ["name", "system_prompt"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }), 400

        # Generate a new UUID if not provided
        if "agent_id" not in data or not data["agent_id"]:
            data["agent_id"] = str(uuid.uuid4())

        # Format JSON fields
        initial_messages = data.get("initial_messages", [])
        settings = data.get("settings", {})

        db_session = get_db_session()

        # Check if agent with this ID already exists
        existing_agent = db_session.query(Agent).filter_by(agent_id=data["agent_id"]).first()
        if existing_agent:
            return jsonify({
                "status": "error",
                "message": f"Agent with ID {data['agent_id']} already exists"
            }), 409

        # Create new agent
        new_agent = Agent(
            agent_id=data["agent_id"],
            name=data["name"],
            system_prompt=data["system_prompt"],
            initial_messages=json.dumps(initial_messages),
            settings=json.dumps(settings),
            from_number=data.get("from_number")
        )

        db_session.add(new_agent)
        db_session.commit()

        logger.info(f"Created agent: {new_agent.agent_id}")

        return jsonify({
            "status": "success",
            "message": "Agent created successfully",
            "agent": new_agent.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Error in create_agent: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@agent.route('/agents/<agent_id>', methods=['PUT'])
def update_agent(agent_id):
    """
    Update an existing agent
    """
    try:
        data = request.json
        logger.info(f"Received update agent request for {agent_id}: {data}")

        db_session = get_db_session()

        # Check if agent exists
        agent = db_session.query(Agent).filter_by(agent_id=agent_id).first()
        if not agent:
            return jsonify({
                "status": "error",
                "message": f"Agent with ID {agent_id} not found"
            }), 404

        # Update fields
        if "name" in data:
            agent.name = data["name"]

        if "system_prompt" in data:
            agent.system_prompt = data["system_prompt"]

        if "initial_messages" in data:
            agent.initial_messages = json.dumps(data["initial_messages"])

        if "settings" in data:
            agent.settings = json.dumps(data["settings"])

        if "from_number" in data:
            agent.from_number = data["from_number"]

        db_session.commit()

        logger.info(f"Updated agent: {agent_id}")

        return jsonify({
            "status": "success",
            "message": "Agent updated successfully",
            "agent": agent.to_dict()
        })

    except Exception as e:
        logger.error(f"Error in update_agent: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@agent.route('/agents/<agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    """
    Delete an agent
    """
    try:
        db_session = get_db_session()

        # Check if agent exists
        agent = db_session.query(Agent).filter_by(agent_id=agent_id).first()
        if not agent:
            return jsonify({
                "status": "error",
                "message": f"Agent with ID {agent_id} not found"
            }), 404

        # Delete the agent
        db_session.delete(agent)
        db_session.commit()

        logger.info(f"Deleted agent: {agent_id}")

        return jsonify({
            "status": "success",
            "message": "Agent deleted successfully"
        })

    except Exception as e:
        logger.error(f"Error in delete_agent: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@agent.route('/agents/duplicate/<agent_id>', methods=['POST'])
def duplicate_agent(agent_id):
    """
    Duplicate an existing agent
    """
    try:
        db_session = get_db_session()

        # Check if source agent exists
        source_agent = db_session.query(Agent).filter_by(agent_id=agent_id).first()
        if not source_agent:
            return jsonify({
                "status": "error",
                "message": f"Agent with ID {agent_id} not found"
            }), 404

        # Generate a new ID for the duplicate
        new_agent_id = str(uuid.uuid4())

        # Create a new agent with the same settings
        new_agent = Agent(
            agent_id=new_agent_id,
            name=f"{source_agent.name} (Copy)",
            system_prompt=source_agent.system_prompt,
            initial_messages=source_agent.initial_messages,
            settings=source_agent.settings,
            from_number=source_agent.from_number
        )

        db_session.add(new_agent)
        db_session.commit()

        logger.info(f"Duplicated agent {agent_id} to {new_agent_id}")

        return jsonify({
            "status": "success",
            "message": "Agent duplicated successfully",
            "agent": new_agent.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Error in duplicate_agent: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)


@agent.route('/agents/bulk-import', methods=['POST'])
def bulk_import_agents():
    """
    Import multiple agents from a JSON array
    """
    try:
        data = request.json

        if not isinstance(data, list):
            return jsonify({
                "status": "error",
                "message": "Expected a JSON array of agents"
            }), 400

        db_session = get_db_session()

        imported_agents = []
        for agent_data in data:
            # Skip if missing required fields
            if not agent_data.get("name") or not agent_data.get("system_prompt"):
                continue

            # Generate ID if not provided
            if not agent_data.get("agent_id"):
                agent_data["agent_id"] = str(uuid.uuid4())

            # Format JSON fields
            initial_messages = agent_data.get("initial_messages", [])
            settings = agent_data.get("settings", {})

            # Check if agent already exists
            existing_agent = db_session.query(Agent).filter_by(agent_id=agent_data["agent_id"]).first()
            if existing_agent:
                # Update existing agent
                existing_agent.name = agent_data["name"]
                existing_agent.system_prompt = agent_data["system_prompt"]
                existing_agent.initial_messages = json.dumps(initial_messages)
                existing_agent.settings = json.dumps(settings)
                if "from_number" in agent_data:
                    existing_agent.from_number = agent_data["from_number"]

                imported_agents.append(existing_agent.to_dict())
            else:
                # Create new agent
                new_agent = Agent(
                    agent_id=agent_data["agent_id"],
                    name=agent_data["name"],
                    system_prompt=agent_data["system_prompt"],
                    initial_messages=json.dumps(initial_messages),
                    settings=json.dumps(settings),
                    from_number=agent_data.get("from_number")
                )

                db_session.add(new_agent)
                imported_agents.append(new_agent.to_dict())

        db_session.commit()

        logger.info(f"Bulk imported {len(imported_agents)} agents")

        return jsonify({
            "status": "success",
            "message": f"Successfully imported {len(imported_agents)} agents",
            "agents": imported_agents
        })

    except Exception as e:
        logger.error(f"Error in bulk_import_agents: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        close_db_session(db_session)