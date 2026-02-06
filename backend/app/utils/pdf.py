
from io import BytesIO
from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa
import os

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

def render_to_pdf(template_name: str, context: dict):
    """
    Renders an HTML template with context and converts it to a PDF.
    """
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    
    # Add strftime filter for date formatting in templates
    def strftime_filter(value, format="%d/%m/%Y"):
        if value:
            return value.strftime(format)
        return ""
    
    env.filters['strftime'] = strftime_filter
    
    template = env.get_template(template_name)
    html_content = template.render(context)
    
    result = BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=result)
    
    if pisa_status.err:
        raise Exception("Error rendering PDF")
        
    result.seek(0)
    return result
 