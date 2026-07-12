"""PDF documents: receipts, bills, quotes and consultation reports.

Each document is an HTML template rendered with Jinja2 and turned into an A4 PDF by
WeasyPrint. Business details come from config/app-settings.json.
"""
from app.documents.render import render_pdf

__all__ = ["render_pdf"]
