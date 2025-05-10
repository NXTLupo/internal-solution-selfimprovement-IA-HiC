import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    REDDIT_CLIENT_ID = os.environ.get('REDDIT_CLIENT_ID')
    REDDIT_CLIENT_SECRET = os.environ.get('REDDIT_CLIENT_SECRET')
    REDDIT_USER_AGENT = os.environ.get('REDDIT_USER_AGENT')
    REDDIT_USERNAME = os.environ.get('REDDIT_USERNAME')
    REDDIT_PASSWORD = os.environ.get('REDDIT_PASSWORD')
    AZURE_DEEPSEEK_KEY = os.environ.get('AZURE_DEEPSEEK_KEY')
    AZURE_OPENAI_API_KEY = os.environ.get('AZURE_OPENAI_API_KEY')
    AZURE_OPENAI_ENDPOINT = os.environ.get('AZURE_OPENAI_ENDPOINT')
    PROJECT_CONNECTION_STRING = os.environ.get('PROJECT_CONNECTION_STRING')
    TEMP_DIR = os.getenv('TEMP_DIR', 'backend/app/routes/tem')
    TOPIC_MODEL_DIR = os.getenv('TOPIC_MODEL_DIR', 'backend/util/topic_model/temp')
    CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY')
    
