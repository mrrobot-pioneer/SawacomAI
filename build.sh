#!/usr/bin/env bash
# Exit on error
set -o errexit

#install all required packages
pip install -r requirements.txt

# Convert static asset files
python manage.py collectstatic --no-input

# Apply any outstanding database migrations
python manage.py migrate

# Check if a superuser exists, if not create one using env vars from Render dashboard
python manage.py shell -c "
from django.contrib.auth import get_user_model;
import os;
User = get_user_model();
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser(
        os.getenv('DJANGO_SUPERUSER_USERNAME','admin'),
        os.getenv('DJANGO_SUPERUSER_EMAIL','admin@example.com'),
        os.getenv('DJANGO_SUPERUSER_PASSWORD','admin')
    )
"