from flask import Blueprint, request, jsonify
import logging
from util.llm_models.mistral import query_mistral
from util.prompts.mistral_prompt import create_reddit_analysis_prompt, extract_keywords_from_prompt
from util.data_store import get_reddit_data

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

local_llm_bp = Blueprint('local_llm', __name__)


@local_llm_bp.route('/chat', methods=['POST'])
def chat():
    try:
        # Get data from request
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        user_prompt = data.get('prompt')
        subreddit = data.get('subreddit')
        date_range = data.get('date_range')
        
        if not user_prompt:
            return jsonify({"error": "No prompt provided"}), 400
        
        logger.info(f"Received chat request for subreddit: {subreddit}, date range: {date_range}")
        
        # Check if we have data for this subreddit
        reddit_data = get_reddit_data(subreddit)
        if not reddit_data:
            logger.warning(f"No cached data found for r/{subreddit}. Response may be less accurate.")
        
        # Use the prompt utility to create a well-structured prompt

        prompt_keywords = extract_keywords_from_prompt(user_prompt)

        keywords = query_mistral(prompt_keywords, timeout=300)

        full_prompt = create_reddit_analysis_prompt(user_prompt, subreddit, date_range, keywords)


        logger.info(f"Generated prompt with length: {len(full_prompt)} characters")
        # Query the Mistral model
        response_text = query_mistral(full_prompt, timeout=300)

        
        return jsonify({"response": response_text})

    except Exception as e:
        logger.exception(f"Exception in chat endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

