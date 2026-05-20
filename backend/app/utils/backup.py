import sqlite3
import gzip
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy.engine import make_url
from app.core.config import settings
from app.utils.logger import logger

RETENTION_DAYS = 7


def get_sqlite_db_path() -> Path:
    url = make_url(settings.DATABASE_URL)
    if not url.database:
        raise ValueError("DATABASE_URL does not include a SQLite database path")

    db_path = Path(url.database)
    if not db_path.is_absolute():
        db_path = Path.cwd() / db_path
    return db_path.resolve()

def perform_db_backup() -> None:
    """
    Safely copies the SQLite database using the native .backup API,
    compresses it to save space, and manages retention.
    """
    try:
        db_path = get_sqlite_db_path()
        backup_dir = db_path.parent / "backups"

        if not db_path.exists():
            logger.error("Backup Fail: DB %s not found", db_path)
            return

        backup_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        raw_backup_path = backup_dir / f"vastu_{timestamp}.db"
        gz_backup_path = backup_dir / f"vastu_{timestamp}.db.gz"

        logger.info("Backup Start: %s", gz_backup_path.name)
        
        # 1. Native safe snapshot
        # Using built-in sqlite3 .backup() handles locks/WAL safely without corruption
        with sqlite3.connect(db_path) as source:
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
        
        for backup_file in backup_dir.glob("vastu_*.db.gz"):
            # Check modification time
            mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
            if mtime < cutoff_date:
                backup_file.unlink()
                deleted_count += 1
                
        if deleted_count > 0:
            logger.info("Backup Clean: Removed %d old file(s)", deleted_count)
            
    except Exception as e:
        logger.error("Backup Error: %s", str(e))
