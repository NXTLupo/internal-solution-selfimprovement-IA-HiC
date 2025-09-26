import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from root directory first, then local
root_env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(root_env_path)  # Load root .env first
load_dotenv()  # Then load local .env if it exists (will override root)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    
    # Reddit API Configuration (from root .env)
    REDDIT_CLIENT_ID = os.environ.get('REDDIT_CLIENT_ID')
    REDDIT_CLIENT_SECRET = os.environ.get('REDDIT_CLIENT_SECRET')
    REDDIT_USER_AGENT = os.environ.get('REDDIT_USER_AGENT')
    REDDIT_REDIRECT_URI = os.environ.get('REDDIT_REDIRECT_URI')
    REDDIT_USERNAME = os.environ.get('REDDIT_USERNAME')  # Optional for personal use scripts
    REDDIT_PASSWORD = os.environ.get('REDDIT_PASSWORD')  # Optional for personal use scripts
    AZURE_DEEPSEEK_KEY = os.environ.get('AZURE_DEEPSEEK_KEY')
    AZURE_OPENAI_API_KEY = os.environ.get('AZURE_OPENAI_API_KEY')
    AZURE_OPENAI_ENDPOINT = os.environ.get('AZURE_OPENAI_ENDPOINT')
    PROJECT_CONNECTION_STRING = os.environ.get('PROJECT_CONNECTION_STRING')
    TEMP_DIR = os.getenv('TEMP_DIR', 'backend/app/routes/tem')
    TOPIC_MODEL_DIR = os.getenv('TOPIC_MODEL_DIR', 'backend/util/topic_model/temp')
    
    # AI API Keys (from root .env file)
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
    CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY')
    CLAUDE4_API_KEY = os.environ.get('CLAUDE4_API_KEY')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    CHATGPT5_API_KEY = os.environ.get('CHATGPT5_API_KEY')
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    
