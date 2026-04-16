import sqlite3
import gzip
import shutil
from datetime import datetime, timedelta
from app.utils.logger import logger
from app.core.config import DEFAULT_DB_PATH

DB_PATH = DEFAULT_DB_PATH
BACKUP_DIR = DEFAULT_DB_PATH.parent / "backups"
RETENTION_DAYS = 7

def perform_db_backup() -> None:
    """
    Safely copies the SQLite database using the native .backup API,
    compresses it to save space, and manages retention.
    """
    try:
        if not DB_PATH.exists():
            logger.error("Backup Fail: DB %s not found", DB_PATH.name)
            return

        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        raw_backup_path = BACKUP_DIR / f"vastu_{timestamp}.db"
        gz_backup_path = BACKUP_DIR / f"vastu_{timestamp}.db.gz"

        logger.info("Backup Start: %s", gz_backup_path.name)
        
        # 1. Native safe snapshot
        # Using built-in sqlite3 .backup() handles locks/WAL safely without corruption
        with sqlite3.connect(DB_PATH) as source:
            with sqlite3.connect(raw_backup_path) as dest:
                source.backup(dest)
        
        # 2. Compress the snapshot
        with open(raw_backup_path, 'rb') as f_in:
            with gzip.open(gz_backup_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
                
        # 3. Clean up the raw uncompressed file
        raw_backup_path.unlink()
        
        logger.info("Backup OK: %s", gz_backup_path.name)

        # 4. Enforce Retention Policy
        cutoff_date = datetime.now() - timedelta(days=RETENTION_DAYS)
        deleted_count = 0
        
        for backup_file in BACKUP_DIR.glob("vastu_*.db.gz"):
            # Check modification time
            mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
            if mtime < cutoff_date:
                backup_file.unlink()
                deleted_count += 1
                
        if deleted_count > 0:
            logger.info("Backup Clean: Removed %d old file(s)", deleted_count)
            
    except Exception as e:
        logger.error("Backup Error: %s", str(e))
