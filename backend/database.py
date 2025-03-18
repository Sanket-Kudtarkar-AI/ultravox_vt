from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models import Base
import os
from config import setup_logging

# Set up logging
logger = setup_logging("database", "database.log")

# Database setup
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///calls.db')

engine = create_engine(DATABASE_URL)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

def init_db():
    """
    Initialize the database with the required tables
    """
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

def get_db_session():
    """
    Get a database session
    """
    try:
        session = db_session()
        return session
    except Exception as e:
        logger.error(f"Error getting database session: {str(e)}")
        raise

def close_db_session(session):
    """
    Close a database session
    """
    try:
        if session:
            session.close()
    except Exception as e:
        logger.error(f"Error closing database session: {str(e)}")

# Initialize the database if this script is run directly
if __name__ == "__main__":
    init_db()
    print("Database initialized successfully")