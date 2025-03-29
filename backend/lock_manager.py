# Add this as a new file: lock_manager.py

import logging
import time
import uuid
import threading
from datetime import datetime, timedelta
from sqlalchemy import func, and_
from models import SystemLock
from database import get_db_session, close_db_session, get_db_session_with_retry

# Set up logging
logger = logging.getLogger("lock_manager")

# Global lock for this process
process_lock = threading.Lock()
LOCK_TIMEOUT = 60  # Lock timeout in seconds
ACQUIRE_TIMEOUT = 30  # How long to try acquiring a lock before giving up
POLL_INTERVAL = 0.5  # How often to check if lock is available

# Process ID to identify locks
PROCESS_ID = str(uuid.uuid4())


def acquire_global_lock(lock_name, timeout=LOCK_TIMEOUT, acquire_timeout=ACQUIRE_TIMEOUT):
    """
    Acquire a global lock across all processes using the database.
    Returns True if lock was acquired, False otherwise.
    """
    # First acquire process-level lock
    acquired = process_lock.acquire(timeout=acquire_timeout)
    if not acquired:
        logger.error(f"Failed to acquire process-level lock for {lock_name}")
        return False

    try:
        start_time = time.time()

        while time.time() - start_time < acquire_timeout:
            db_session = get_db_session_with_retry()
            try:
                # Check if lock exists and is expired
                current_time = datetime.now()
                lock = db_session.query(SystemLock).filter_by(lock_name=lock_name).first()

                if lock:
                    # If lock exists but is expired, delete it
                    if lock.expires_at < current_time:
                        logger.warning(f"Found expired lock {lock_name} from {lock.locked_by}, removing")
                        db_session.delete(lock)
                    else:
                        # Lock exists and is still valid
                        logger.info(f"Lock {lock_name} is held by {lock.locked_by} until {lock.expires_at}")
                        db_session.commit()
                        close_db_session(db_session)
                        time.sleep(POLL_INTERVAL)
                        continue

                # Create new lock
                new_lock = SystemLock(
                    lock_name=lock_name,
                    locked_by=PROCESS_ID,
                    expires_at=current_time + timedelta(seconds=timeout)
                )

                db_session.add(new_lock)
                db_session.commit()
                logger.info(f"Successfully acquired global lock {lock_name}")
                return True

            except Exception as e:
                logger.error(f"Error acquiring global lock {lock_name}: {str(e)}")
                db_session.rollback()

            finally:
                close_db_session(db_session)

            # Wait a bit before trying again
            time.sleep(POLL_INTERVAL)

        logger.error(f"Timed out trying to acquire global lock {lock_name}")
        return False

    finally:
        # If we didn't acquire the database lock, release the process lock
        if time.time() - start_time >= acquire_timeout:
            process_lock.release()


def release_global_lock(lock_name):
    """
    Release a previously acquired global lock
    """
    try:
        db_session = get_db_session_with_retry()
        try:
            # Only delete the lock if it belongs to this process
            lock = db_session.query(SystemLock).filter(
                and_(
                    SystemLock.lock_name == lock_name,
                    SystemLock.locked_by == PROCESS_ID
                )
            ).first()

            if lock:
                db_session.delete(lock)
                db_session.commit()
                logger.info(f"Released global lock {lock_name}")
            else:
                logger.warning(f"Attempted to release lock {lock_name} but it was not held by this process")

        except Exception as e:
            logger.error(f"Error releasing global lock {lock_name}: {str(e)}")
            db_session.rollback()

        finally:
            close_db_session(db_session)

    finally:
        # Always release the process lock
        if process_lock.locked():
            process_lock.release()


class GlobalLock:
    """
    Context manager for global locks

    Usage:
    with GlobalLock("my_lock_name"):
        # Do something that requires exclusive access
    """

    def __init__(self, lock_name, timeout=LOCK_TIMEOUT, acquire_timeout=ACQUIRE_TIMEOUT):
        self.lock_name = lock_name
        self.timeout = timeout
        self.acquire_timeout = acquire_timeout
        self.acquired = False

    def __enter__(self):
        self.acquired = acquire_global_lock(self.lock_name, self.timeout, self.acquire_timeout)
        return self.acquired

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.acquired:
            release_global_lock(self.lock_name)