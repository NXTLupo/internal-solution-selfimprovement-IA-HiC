@echo off
echo Installing required dependencies...
pip install -r requirements.txt

echo Running Flask application...
set FLASK_APP=app.py
set FLASK_DEBUG=1
python -m flask run --host=0.0.0.0 --port=5000