"""
ASGI config for EduStat-TN project.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "edustat.settings")
application = get_asgi_application()
