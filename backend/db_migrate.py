"""
Campaign Progress Migration Script

This script adds progress and analysis_progress columns to the campaigns table.
It should be run once after updating the models.py file.
"""

import sqlite3
import logging
import sys

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('migration.log')
    ]
)

logger = logging.getLogger('migration')

# Database file path
DB_FILE = 'calls.db'


def migrate_campaigns_table():
    """
    Add progress and analysis_progress columns to the campaigns table
    """
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        # Check if columns already exist to avoid errors
        cursor.execute("PRAGMA table_info(campaigns)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]

        # Add progress column if it doesn't exist
        if 'progress' not in column_names:
            logger.info("Adding 'progress' column to campaigns table...")
            cursor.execute("ALTER TABLE campaigns ADD COLUMN progress INTEGER DEFAULT 0")
            logger.info("'progress' column added successfully.")
        else:
            logger.info("'progress' column already exists.")

        # Add analysis_progress column if it doesn't exist
        if 'analysis_progress' not in column_names:
            logger.info("Adding 'analysis_progress' column to campaigns table...")
            cursor.execute("ALTER TABLE campaigns ADD COLUMN analysis_progress INTEGER DEFAULT 0")
            logger.info("'analysis_progress' column added successfully.")
        else:
            logger.info("'analysis_progress' column already exists.")

        # Calculate and update progress for existing campaigns
        logger.info("Calculating progress for existing campaigns...")
        cursor.execute("""
            WITH campaign_stats AS (
                SELECT 
                    campaign_id,
                    COUNT(*) AS total,
                    SUM(CASE WHEN status IN ('completed', 'failed', 'no-answer') THEN 1 ELSE 0 END) AS processed
                FROM campaign_contacts
                GROUP BY campaign_id
            )
            UPDATE campaigns
            SET progress = CASE 
                WHEN (SELECT total FROM campaign_stats WHERE campaign_stats.campaign_id = campaigns.campaign_id) > 0 
                THEN ROUND((SELECT processed * 100.0 / total FROM campaign_stats WHERE campaign_stats.campaign_id = campaigns.campaign_id))
                ELSE 0
            END
            WHERE EXISTS (SELECT 1 FROM campaign_stats WHERE campaign_stats.campaign_id = campaigns.campaign_id)
        """)

        # Update status for campaigns with 100% progress that are still marked as running
        cursor.execute("""
            UPDATE campaigns
            SET status = 'completed'
            WHERE status = 'running' AND progress = 100
        """)

        # Commit the changes
        conn.commit()
        logger.info("Database migration completed successfully.")

    except Exception as e:
        logger.error(f"Error migrating database: {str(e)}")
        conn.rollback()
        return False
    finally:
        conn.close()

    return True


if __name__ == "__main__":
    logger.info("Starting database migration...")
    success = migrate_campaigns_table()

    if success:
        logger.info("Migration completed successfully.")
        sys.exit(0)
    else:
        logger.error("Migration failed.")
        sys.exit(1)