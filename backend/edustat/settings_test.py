"""
Test settings — uses SQLite for fast unit tests without PostgreSQL.
Usage : python manage.py test --settings=edustat.settings_test
"""
from edustat.settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Disable password hashing for faster tests
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Silence logging during tests
LOGGING = {}
