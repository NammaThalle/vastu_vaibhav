import logging
import sys
import time

class ColoredFormatter(logging.Formatter):
    COLORS = {
        "DEBUG": "\033[36m",      # Cyan
        "INFO": "\033[32m",       # Green
        "WARNING": "\033[33m",    # Orange/Yellow
        "ERROR": "\033[31m",      # Red
        "CRITICAL": "\033[35m",   # Magenta
    }
    SOURCE_COLORS = {
        "BACKEND": "\033[1;37m",  # Bold White
        "FRONTEND": "\033[1;34m", # Bold Blue
    }
    RESET = "\033[0m"

    def format(self, record):
        levelname = record.levelname
        color = self.COLORS.get(levelname, self.RESET)
        
        # Get source from record, default to BACKEND
        source = getattr(record, "source", "BACKEND")
        source_color = self.SOURCE_COLORS.get(source, self.RESET)
        
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(record.created))
        
        # Format: 2025-12-12 12:35:57 - [BACKEND] - INFO - filename:line - message
        message = (
            f"{timestamp} - {source_color}[{source}]{self.RESET} - "
            f"{color}{levelname}{self.RESET} - "
            f"{record.filename}:{record.lineno} - {record.getMessage()}"
        )
        return message

def setup_logging():
    # Configure custom logger for the app
    logging.basicConfig(
        level=logging.INFO,
        handlers=[],  # Remove default handlers
        force=True,
    )

    # Create and configure handler with colored formatter
    handler = logging.StreamHandler(sys.stdout)
    formatter = ColoredFormatter()
    handler.setFormatter(formatter)

    # Add handler to root logger
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    # Suppress verbose library logs
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)

logger = logging.getLogger("vastu_vaibhav")
