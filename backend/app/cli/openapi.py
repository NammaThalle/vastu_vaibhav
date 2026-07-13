"""Write the API's OpenAPI schema to a file; the frontend generates its types from it.

Usage: python -m app.cli.openapi path/to/openapi.json
"""
import json
import sys
from pathlib import Path

from app.main import app

if __name__ == "__main__":
    Path(sys.argv[1]).write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n")
