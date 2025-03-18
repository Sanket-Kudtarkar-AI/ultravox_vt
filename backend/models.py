from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class CallMapping(Base):
    """
    Model to store the mapping between Plivo call_uuid and Ultravox call_id
    """
    __tablename__ = 'call_mappings'

    id = Column(Integer, primary_key=True)
    plivo_call_uuid = Column(String(255), unique=True, nullable=False, index=True)
    ultravox_call_id = Column(String(255), unique=True, nullable=False, index=True)
    recipient_phone_number = Column(String(20))
    plivo_phone_number = Column(String(20))
    system_prompt = Column(Text)
    timestamp = Column(DateTime, default=func.now())

    def __repr__(self):
        return f"<CallMapping plivo_uuid={self.plivo_call_uuid} ultravox_id={self.ultravox_call_id}>"

    def to_dict(self):
        """
        Convert model to dictionary for API responses
        """
        return {
            "id": self.id,
            "plivo_call_uuid": self.plivo_call_uuid,
            "ultravox_call_id": self.ultravox_call_id,
            "recipient_phone_number": self.recipient_phone_number,
            "plivo_phone_number": self.plivo_phone_number,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }


class CallAnalytics(Base):
    """
    Model to store call analytics data
    """
    __tablename__ = 'call_analytics'

    id = Column(Integer, primary_key=True)
    call_mapping_id = Column(Integer, ForeignKey('call_mappings.id'), nullable=False)
    total_duration = Column(Integer)  # In seconds
    total_messages = Column(Integer)
    agent_messages = Column(Integer)
    user_messages = Column(Integer)
    avg_agent_response_length = Column(Integer)  # In characters
    avg_user_response_length = Column(Integer)  # In characters
    call_success = Column(Boolean, default=True)
    analyzed_at = Column(DateTime, default=func.now())

    def __repr__(self):
        return f"<CallAnalytics id={self.id} call_mapping_id={self.call_mapping_id}>"

    def to_dict(self):
        """
        Convert model to dictionary for API responses
        """
        return {
            "id": self.id,
            "call_mapping_id": self.call_mapping_id,
            "total_duration": self.total_duration,
            "total_messages": self.total_messages,
            "agent_messages": self.agent_messages,
            "user_messages": self.user_messages,
            "avg_agent_response_length": self.avg_agent_response_length,
            "avg_user_response_length": self.avg_user_response_length,
            "call_success": self.call_success,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None
        }