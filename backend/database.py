from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models import Base
import os
from config import setup_logging, DATABASE_URL # Import DATABASE_URL from config

# Set up logging
logger = setup_logging("database", "database.log")

# Database setup - Using the DATABASE_URL from config.py
# This URL is now configured for Azure SQL using pyodbc
try:
    # Added connect_args for pyodbc specific settings if needed,
    # but usually the connection string handles it.
    # Consider adding echo=True for debugging SQL queries during development
    engine = create_engine(DATABASE_URL) #
    db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    logger.info(f"Successfully created database engine for: {DATABASE_URL.split('@')[-1].split('?')[0]}") # Log without credentials
except Exception as e:
    logger.error(f"Error creating database engine: {str(e)}")
    # Depending on your application structure, you might want to raise this
    # error further or exit if the database connection is critical.
    raise

def init_db():
    """
    Initialize the database with the required tables
    """
    try:
        # Create all tables if they don't exist
        Base.metadata.create_all(bind=engine) #
        logger.info("Database tables checked/created successfully.")
    except Exception as e:
        logger.error(f"Error initializing database schema: {str(e)}") #
        raise

def get_db_session():
    """
    Get a database session
    """
    try:
        session = db_session() #
        return session
    except Exception as e:
        logger.error(f"Error getting database session: {str(e)}") #
        # Clean up the session factory in case of critical error
        db_session.remove()
        raise

def close_db_session(session):
    """
    Close a database session
    """
    if session:
        try:
            session.close() #
        except Exception as e:
            logger.error(f"Error closing database session: {str(e)}") #

# Note: Removed the direct call to init_db() here.
# It's better to call init_db() explicitly from your main application
# startup script (e.g., plivo_server.py) after the app is configured.
# Example:
# if __name__ == "__main__":
#     print("Running database initialization directly (for testing)...")
#     init_db()
#     print("Database initialization complete.")