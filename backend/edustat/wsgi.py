"""
WSGI config for EduStat-TN project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "edustat.settings")
application = get_wsgi_application()
