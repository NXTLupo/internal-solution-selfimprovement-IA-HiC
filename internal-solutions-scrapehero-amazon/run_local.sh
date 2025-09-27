#!/bin/bash
# Install required dependencies if not already installed
pip install -r requirements.txt

# Run the Flask application
export FLASK_APP=app.py
export FLASK_DEBUG=1
python -m flask run --host=0.0.0.0 --port=5000