from sqlalchemy import (
    Column, String, DateTime, Integer, ForeignKey, Boolean, Text, Table,
    DECIMAL  # Consider using DECIMAL for currency/financial figures if needed
)
from sqlalchemy.dialects.mssql import DATETIME2  # Use appropriate SQL Server types if needed
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import json
import logging

# Get logger for models
logger = logging.getLogger("models")

Base = declarative_base()


# Note: Review data types for Azure SQL Server compatibility.
# - TEXT might map to NVARCHAR(MAX). Check if specific length limits are needed.
# - DateTime might map differently; SQLAlchemy handles basic cases, but check precision
#   or timezone requirements. Using DATETIME2 from sqlalchemy.dialects.mssql might be
#   more explicit for SQL Server if needed.
# - JSON storage: SQL Server has JSON support, but SQLAlchemy's default JSON type
#   might need configuration or testing depending on your specific usage.

class Agent(Base):
    """
    Model to store agent configurations
    """
    __tablename__ = 'agents'

    agent_id = Column(String(255), primary_key=True)  #
    name = Column(String(255), nullable=False)  #
    system_prompt = Column(Text, nullable=False)  #
    initial_messages = Column(Text, nullable=False)  # JSON serialized
    settings = Column(Text, nullable=False)  # JSON serialized
    from_number = Column(String(20), nullable=True)  #
    # Consider using server_default with func.now() for database-level defaults
    created_at = Column(DateTime, default=func.now())  #
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  #

    # Relationships
    calls = relationship("CallLog", back_populates="agent")  #
    campaigns = relationship("Campaign", back_populates="agent")  #

    def __repr__(self):
        return f"<Agent id={self.agent_id} name={self.name}>"  #

    def to_dict(self):
        # Safely parse JSON fields
        try:
            initial_messages_data = json.loads(self.initial_messages or '[]')  #
        except json.JSONDecodeError:
            logger.warning(f"Could not parse initial_messages JSON for agent {self.agent_id}")
            initial_messages_data = []
        try:
            settings_data = json.loads(self.settings or '{}')  #
        except json.JSONDecodeError:
            logger.warning(f"Could not parse settings JSON for agent {self.agent_id}")
            settings_data = {}

        return {
            "agent_id": self.agent_id,  #
            "name": self.name,  #
            "system_prompt": self.system_prompt,  #
            "initial_messages": initial_messages_data,  #
            "settings": settings_data,  #
            "from_number": self.from_number,  #
            "created_at": self.created_at.isoformat() if self.created_at else None,  #
            "updated_at": self.updated_at.isoformat() if self.updated_at else None  #
        }


class Campaign(Base):
    """
    Model to store campaign information
    """
    __tablename__ = 'campaigns'

    campaign_id = Column(Integer, primary_key=True)  #
    campaign_name = Column(String(255), nullable=False)  #
    # Ensure Agent relationship uses correct foreign key reference
    assigned_agent_id = Column(String(255), ForeignKey('agents.agent_id'), nullable=False)  #
    assigned_agent_name = Column(String(255), nullable=False)  #
    from_number = Column(String(20), nullable=False)  #
    created_at = Column(DateTime, default=func.now())  #
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  #
    total_contacts = Column(Integer, default=0)  #
    schedule_date = Column(DateTime, nullable=True)  #
    status = Column(String(20), default='created')  # created, running, paused, completed
    file_name = Column(String(255), nullable=True)  #
    config = Column(Text, nullable=True)  # JSON serialized for additional config

    # Relationships
    agent = relationship("Agent", back_populates="campaigns")  #
    calls = relationship("CallLog", back_populates="campaign")  #
    contacts = relationship("CampaignContact", back_populates="campaign", cascade="all, delete-orphan")  # Added cascade

    def __repr__(self):
        return f"<Campaign id={self.campaign_id} name={self.campaign_name}>"  #

    def to_dict(self):
        # Safely parse JSON fields
        try:
            config_data = json.loads(self.config or '{}')  #
        except json.JSONDecodeError:
            logger.warning(f"Could not parse config JSON for campaign {self.campaign_id}")
            config_data = {}

        return {
            "campaign_id": self.campaign_id,  #
            "campaign_name": self.campaign_name,  #
            "assigned_agent_id": self.assigned_agent_id,  #
            "assigned_agent_name": self.assigned_agent_name,  #
            "from_number": self.from_number,  #
            "created_at": self.created_at.isoformat() if self.created_at else None,  #
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,  #
            "total_contacts": self.total_contacts,  #
            "schedule_date": self.schedule_date.isoformat() if self.schedule_date else None,  #
            "status": self.status,  #
            "file_name": self.file_name,  #
            "config": config_data  #
        }


class CampaignContact(Base):
    """
    Model to store campaign contacts
    """
    __tablename__ = 'campaign_contacts'

    id = Column(Integer, primary_key=True)  #
    campaign_id = Column(Integer, ForeignKey('campaigns.campaign_id'), nullable=False)  #
    name = Column(String(255))  #
    phone = Column(String(20), nullable=False, index=True)  # Added index
    status = Column(String(20), default='pending', index=True)  # Added index #
    # Consider making call_uuid a ForeignKey relationship for data integrity
    # call_uuid = Column(String(255), ForeignKey('call_logs.call_uuid'), nullable=True)
    call_uuid = Column(String(255), nullable=True, index=True)  # Added index
    additional_data = Column(Text)  # JSON serialized
    created_at = Column(DateTime, default=func.now())  #
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  #

    # Relationships
    campaign = relationship("Campaign", back_populates="contacts")  #

    # If using ForeignKey for call_uuid:
    # call_log = relationship("CallLog")

    def __repr__(self):
        return f"<CampaignContact id={self.id} phone={self.phone}>"  #

    def to_dict(self):
        # Safely parse JSON
        try:
            additional_data_dict = json.loads(self.additional_data or '{}')  #
        except json.JSONDecodeError:
            logger.warning(f"Could not parse additional_data JSON for contact {self.id}")
            additional_data_dict = {}

        return {
            "id": self.id,  #
            "campaign_id": self.campaign_id,  #
            "name": self.name,  #
            "phone": self.phone,  #
            "status": self.status,  #
            "call_uuid": self.call_uuid,  #
            "additional_data": additional_data_dict,  #
            "created_at": self.created_at.isoformat() if self.created_at else None,  #
            "updated_at": self.updated_at.isoformat() if self.updated_at else None  #
        }


class CallLog(Base):
    """
    Comprehensive model for call logs that combines Plivo and Ultravox data
    """
    __tablename__ = 'call_logs'

    id = Column(Integer, primary_key=True)  #
    # Ensure call_uuid uniqueness constraint works in Azure SQL
    call_uuid = Column(String(255), unique=True, nullable=False, index=True)  #
    ultravox_id = Column(String(255), unique=True, index=True, nullable=True)  #
    agent_id = Column(String(255), ForeignKey('agents.agent_id'), nullable=True, index=True)  # Added index
    campaign_id = Column(Integer, ForeignKey('campaigns.campaign_id'), nullable=True, index=True)  # Added index

    # Call details
    to_number = Column(String(20), nullable=False, index=True)  # Added index
    from_number = Column(String(20), nullable=False)  #
    call_state = Column(String(50))  # Increased length slightly #
    call_duration = Column(Integer)  # in seconds #
    initiation_time = Column(DateTime, index=True)  # Added index #
    answer_time = Column(DateTime)  #
    end_time = Column(DateTime, index=True)  # Added index #
    hangup_cause_name = Column(String(255))  #
    hangup_source = Column(String(255))  #

    # Cache for Plivo and Ultravox data
    # Ensure TEXT type maps appropriately (NVARCHAR(MAX) in SQL Server)
    plivo_data = Column(Text)  # JSON serialized full response #
    ultravox_data = Column(Text)  # JSON serialized full response #
    transcription = Column(Text)  # JSON serialized #
    recording_url = Column(Text)  #
    summary = Column(Text)  #

    # System settings
    system_prompt = Column(Text)  #
    language_hint = Column(String(10))  #
    voice = Column(String(100))  #
    max_duration = Column(String(10))  #

    # Metadata
    created_at = Column(DateTime, default=func.now(), index=True)  # Added index #
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  #

    # Relationships
    agent = relationship("Agent", back_populates="calls")  #
    campaign = relationship("Campaign", back_populates="calls")  #
    analytics = relationship("CallAnalytics", uselist=False, back_populates="call",
                             cascade="all, delete-orphan")  # Added cascade

    def __repr__(self):
        return f"<CallLog id={self.id} call_uuid={self.call_uuid}>"  #

    def to_dict(self):
        # Safely parse JSON fields
        try:
            plivo_data_dict = json.loads(self.plivo_data or '{}')
        except json.JSONDecodeError:
            logger.warning(f"Could not parse plivo_data JSON for call log {self.id}")
            plivo_data_dict = {}
        try:
            ultravox_data_dict = json.loads(self.ultravox_data or '{}')
        except json.JSONDecodeError:
            logger.warning(f"Could not parse ultravox_data JSON for call log {self.id}")
            ultravox_data_dict = {}

        return {
            "id": self.id,  #
            "call_uuid": self.call_uuid,  #
            "ultravox_id": self.ultravox_id,  #
            "agent_id": self.agent_id,  #
            "campaign_id": self.campaign_id,  #
            "to_number": self.to_number,  #
            "from_number": self.from_number,  #
            "call_state": self.call_state,  #
            "call_duration": self.call_duration,  #
            "initiation_time": self.initiation_time.isoformat() if self.initiation_time else None,  #
            "answer_time": self.answer_time.isoformat() if self.answer_time else None,  #
            "end_time": self.end_time.isoformat() if self.end_time else None,  #
            "hangup_cause_name": self.hangup_cause_name,  #
            "hangup_source": self.hangup_source,  #
            "recording_url": self.recording_url,  #
            "summary": self.summary,  #
            # Add raw data if needed, but be mindful of size
            # "plivo_data": plivo_data_dict,
            # "ultravox_data": ultravox_data_dict,
            "created_at": self.created_at.isoformat() if self.created_at else None,  #
            "updated_at": self.updated_at.isoformat() if self.updated_at else None  #
        }

    def to_dict_with_transcription(self):
        """Extended to_dict that includes transcription data"""  #
        result = self.to_dict()
        try:
            result["transcription"] = json.loads(self.transcription or 'null')  #
        except json.JSONDecodeError:
            logger.warning(f"Could not parse transcription JSON for call log {self.id}")
            result["transcription"] = None
        return result


class CallAnalytics(Base):
    """
    Model to store call analytics data
    """
    __tablename__ = 'call_analytics'

    id = Column(Integer, primary_key=True)  #
    # Ensure ForeignKey constraint is correctly set up for Azure SQL
    call_id = Column(Integer, ForeignKey('call_logs.id'), nullable=False,
                     unique=True)  # Added unique=True assuming one analytics per call #
    total_duration = Column(Integer)  # In seconds #
    total_messages = Column(Integer)  #
    agent_messages = Column(Integer)  #
    user_messages = Column(Integer)  #
    avg_agent_response_length = Column(Integer)  # In characters #
    avg_user_response_length = Column(Integer)  # In characters #
    call_success = Column(Boolean, default=True)  #
    entities_extracted = Column(Text)  # JSON serialized #
    sentiment_analysis = Column(Text)  # JSON serialized #
    analyzed_at = Column(DateTime, default=func.now())  #

    # Relationships
    call = relationship("CallLog", back_populates="analytics")  #

    def __repr__(self):
        return f"<CallAnalytics id={self.id} call_id={self.call_id}>"  #

    def to_dict(self):
        # Safely parse JSON
        try:
            entities = json.loads(self.entities_extracted or '{}')  #
        except json.JSONDecodeError:
            logger.warning(f"Could not parse entities_extracted JSON for analytics {self.id}")
            entities = {}
        try:
            sentiment = json.loads(self.sentiment_analysis or '{}')  #
        except json.JSONDecodeError:
            logger.warning(f"Could not parse sentiment_analysis JSON for analytics {self.id}")
            sentiment = {}

        return {
            "id": self.id,  #
            "call_id": self.call_id,  #
            "total_duration": self.total_duration,  #
            "total_messages": self.total_messages,  #
            "agent_messages": self.agent_messages,  #
            "user_messages": self.user_messages,  #
            "avg_agent_response_length": self.avg_agent_response_length,  #
            "avg_user_response_length": self.avg_user_response_length,  #
            "call_success": self.call_success,  #
            "entities_extracted": entities,  #
            "sentiment_analysis": sentiment,  #
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None  #
        }


class SavedPhoneNumber(Base):
    """
    Model to store saved phone numbers
    """
    __tablename__ = 'saved_phone_numbers'

    id = Column(Integer, primary_key=True)  #
    # Ensure unique constraint works correctly in Azure SQL
    phone_number = Column(String(20), nullable=False, index=True, unique=True)  #
    label = Column(String(255), nullable=True)  # Optional label/name for the number #
    number_type = Column(String(20), nullable=False, index=True)  # 'recipient' or 'from', added index #
    last_used = Column(DateTime, default=func.now(), index=True)  # Added index #
    created_at = Column(DateTime, default=func.now())  #

    def __repr__(self):
        return f"<SavedPhoneNumber id={self.id} phone={self.phone_number} type={self.number_type}>"  #

    def to_dict(self):
        return {
            "id": self.id,  #
            "phone_number": self.phone_number,  #
            "label": self.label,  #
            "number_type": self.number_type,  #
            "last_used": self.last_used.isoformat() if self.last_used else None,  #
            "created_at": self.created_at.isoformat() if self.created_at else None  #
        }


# --- Legacy CallMapping ---
# This table is kept for backward compatibility as mentioned in original code.
# Consider migrating data from this table to CallLog and eventually removing it.
class CallMapping(Base):
    """
    Legacy model to store the mapping between Plivo call_uuid and Ultravox call_id.
    Maintained for backward compatibility. New calls should use CallLog.
    """
    __tablename__ = 'call_mappings'

    id = Column(Integer, primary_key=True)  #
    plivo_call_uuid = Column(String(255), unique=True, nullable=False, index=True)  #
    ultravox_call_id = Column(String(255), unique=True, nullable=True,
                              index=True)  # Allow nullable for calls before mapping #
    recipient_phone_number = Column(String(20))  #
    plivo_phone_number = Column(String(20))  #
    system_prompt = Column(Text)  #
    timestamp = Column(DateTime, default=func.now())  #

    def __repr__(self):
        return f"<CallMapping plivo_uuid={self.plivo_call_uuid} ultravox_id={self.ultravox_call_id}>"  #

    def to_dict(self):
        """
        Convert model to dictionary for API responses
        """
        return {
            "id": self.id,  #
            "plivo_call_uuid": self.plivo_call_uuid,  #
            "ultravox_call_id": self.ultravox_call_id,  #
            "recipient_phone_number": self.recipient_phone_number,  #
            "plivo_phone_number": self.plivo_phone_number,  #
            "timestamp": self.timestamp.isoformat() if self.timestamp else None  #
        }
