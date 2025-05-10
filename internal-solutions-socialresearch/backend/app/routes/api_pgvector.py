from flask import Blueprint, request, jsonify
from flask_cors import CORS
from app.db.models.reddit_models import RedditPost
from app.db.config.database import SessionLocal
from app.repositories.reddit_repository import RedditRepository
from typing import List, Dict
from util.llm_models.pgvector.pgvector import query_pgvector, get_rag_response
from util.prompts.rag_prompt import get_openai_rag_prompt
from util.llm_models.openai import get_openai_completion
from util.llm_models.claude import get_claude_completion
import os
import json
from typing import Any
import numpy as np
import re
from app.db.config.database import get_db

rag_bp = Blueprint('rag', __name__)
CORS(rag_bp)

@rag_bp.route('/query', methods=['POST'])
def rag_query():
    """
    Endpoint to query the RAG system with a question about a subreddit.
    
    Request body:
    {
        "prompt": "What do users think about battery life?",
        "subreddit": "ouraring"
    }
    
    Returns:
    {
        "answer": "Based on the information...",
        "sources": [...]
    }
    """
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.json
        else:
            data = request.form
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        prompt = data.get('prompt')
        subreddit = data.get('subreddit')
        topicData = data.get('topicData')
        topicData = json.loads(topicData)
        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400
        
        if not subreddit:
            return jsonify({"error": "No subreddit provided"}), 400
        
        # Filter topic data to only include essential information
        filtered_topic_data = filter_topic_data(topicData)
        debug_print("0.topicData.json", filtered_topic_data)
        
        # Get RAG response
        response = get_result(subreddit, prompt, filtered_topic_data)

        return jsonify(response), 200
    
    except Exception as e:
        import traceback
        print(f"Error in RAG query: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

def get_result(subreddit: str, prompt: str, topicData: dict) -> list:
    """
    Gets the RAG results for a given subreddit and prompt.
    """
    # vector search
    rag_results = get_rag_response(subreddit, prompt)
    debug_print("1.rag_results.json", rag_results)

    # keyword search
    keywords_result = IDs_keywords(prompt)

    if keywords_result != "none":
        rag_results = add_keywords_to_rag_results(prompt, rag_results, keywords_result) 

    processed_rag_results = process_rag_results(rag_results)

    debug_print("2.processed_rag_results.json", processed_rag_results)
    model = "claude"


    if model == "claude":
        prompt_with_topics = get_openai_rag_prompt(prompt, processed_rag_results, topicData)
        debug_print("3.prompt.json", prompt_with_topics)
        messages = [{"role": "user", "content": prompt_with_topics}]
        response = get_claude_completion(messages, temperature=0.6)
        debug_print("4.response.json", response)
    elif model == "openai":
        prompt_with_topics = get_openai_rag_prompt(prompt, processed_rag_results, topicData)
        debug_print("3.prompt.json", prompt_with_topics)
        messages = [{"role": "user", "content": prompt_with_topics}]

        response = get_openai_completion(messages, temperature=0.6)
        debug_print("4.response.json", response)

    return response


def IDs_keywords(prompt: str) -> list:
    """
    Extracts the IDs and keywords from the prompt and gets related posts using OpenAI.
    
    Args:
        prompt (str): The user's question or request
        
    Returns:
        list: List of relevant Reddit posts based on keywords or "none" if no keywords found
    """
    try:
        # Extract keywords from prompt using OpenAI
        from util.prompts.mistral_prompt import extract_keywords_from_prompt
        from util.llm_models.openai import get_openai_completion
        
        # Generate a prompt to extract keywords
        keywords_prompt = extract_keywords_from_prompt(prompt)
        debug_print("0.keywords_prompt.json", keywords_prompt)
        
        # Query OpenAI to extract the keywords
        keywords_messages = [{"role": "user", "content": keywords_prompt}]
        keywords = get_openai_completion(keywords_messages, temperature=0.2)
        debug_print("1.keywords.json", keywords)
        
        # Check if we got meaningful keywords
        if not keywords or keywords.strip().lower() in ['none', 'no keywords', '']:
            return "none"
            
        # Use the keywords to get related posts
        posts_data = get_IDs_from_keywords(keywords)
        
        return posts_data
        
    except Exception as e:
        import traceback
        print(f"Error in IDs_keywords: {str(e)}")
        print(traceback.format_exc())
        return "none"

def process_rag_results(rag_results: list) -> list:
    processed_results = []
    
    for result in rag_results:
        # Create markdown formatted content
        title = result.get('title', '')
        content = result.get('content', '')
        post_id = result.get('id', '')
        
        # Remove any links from content
        content = re.sub(r'https?://\S+', '', content).strip()
        
        # Add the post ID prominently at the top
        markdown_content = f"# Post {post_id}: {title}\n\n{content}\n\n"
        
        # Process comments if they exist
        if 'comments' in result:
            markdown_content += "## Comments:\n\n"
            
            # Function to recursively process comments and their replies
            def process_comment_tree(comment, depth=0):
                if comment.get('body') == '[deleted]':
                    return ""
                
                # Remove any links from comment body
                comment_body = re.sub(r'https?://\S+', '', comment.get('body', '')).strip()
                comment_id = comment.get('id', '')
                
                # Format with markdown indentation and include comment ID
                indent = "  " * depth
                prefix = "- " if depth == 0 else "  - "
                comment_text = f"{indent}{prefix}Comment {comment_id}: {comment_body}\n"
                
                # Process replies recursively
                if 'replies' in comment and comment['replies']:
                    for reply in comment['replies']:
                        comment_text += process_comment_tree(reply, depth + 1)
                
                return comment_text
            
            # Process all top-level comments
            for comment in result.get('comments', []):
                markdown_content += process_comment_tree(comment)
        
        processed_item = {
            'id': post_id,
            'markdown_content': markdown_content.strip()
        }
        
        processed_results.append(processed_item)
    
    return processed_results

def add_keywords_to_rag_results(prompt: str, rag_results: list, keyword_results: list) -> list:
    """
    Combines RAG results with keyword-based results, avoiding duplicates.
    
    Args:
        rag_results (list): Results from vector search
        keyword_results (list): Results from keyword search
        
    Returns:
        list: Combined results with duplicates removed
    """
    if not keyword_results:
        return rag_results
        
    # Keep track of post IDs we've already seen
    existing_post_ids = {post.get('id') for post in rag_results}
    
    # Add keyword results that aren't duplicates
    for post in keyword_results:
        post_id = post.get('id')
        if post_id and post_id not in existing_post_ids:
            rag_results.append(post)
            existing_post_ids.add(post_id)
    
    return rag_results

def debug_print(path: str, data: Any):
    prior_path = "./app/routes/temp/"
    os.makedirs(os.path.dirname(prior_path + path), exist_ok=True)
    
    # Convert NumPy arrays to lists before serializing to JSON
    def numpy_to_list(obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: numpy_to_list(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [numpy_to_list(item) for item in obj]
        else:
            return obj
    
    # Convert any NumPy arrays in the data to lists
    serializable_data = numpy_to_list(data)
    
    with open(prior_path + path, 'w') as f:
        json.dump(serializable_data, f, indent=4)

def get_IDs_from_keywords(keywords: str) -> list:
    """
    Gets post data from keywords.
    
    Args:
        keywords (str): Comma-separated list of keywords from Mistral
        
    Returns:
        list: List of Reddit posts matching these keywords
    """
    try:
        # Clean up keywords - Mistral may return more than just keywords
        keywords = keywords.strip()
        # Split on commas if multiple keywords
        keyword_list = [k.strip() for k in keywords.split(',') if k.strip()]
        
        if not keyword_list:
            return []
            
        # Get database connection
        db = next(get_db())
        
        # Find posts that contain any of these keywords
        # Using a simple ILIKE query for each keyword
        from sqlalchemy.orm import joinedload
        from app.db.models.reddit_models import RedditPost, RedditComment
        
        query = db.query(RedditPost).options(joinedload(RedditPost.comments))
        
        # Build the OR condition for each keyword
        from sqlalchemy import or_
        keyword_conditions = []
        for keyword in keyword_list:
            # Search in both title and content
            keyword_conditions.append(RedditPost.title.ilike(f'%{keyword}%'))
            keyword_conditions.append(RedditPost.content.ilike(f'%{keyword}%'))
        
        # Apply the OR conditions and limit to 5 posts
        posts = query.filter(or_(*keyword_conditions)).limit(5).all()
        
        # Format the results similarly to get_rag_response
        results = []
        for post in posts:
            # Create a dictionary for the post
            post_dict = {
                "id": post.id,
                "title": post.title,
                "content": post.content,
                "score": post.score,
                "created_utc": post.created_utc,
                "comments": []
            }
            
            # Process comments
            comment_dict = {}
            
            # First, collect all comments
            for comment in post.comments:
                comment_dict[comment.id] = {
                    "id": comment.id,
                    "body": comment.body,
                    "score": comment.score,
                    "created_utc": comment.created_utc,
                    "parent_comment_id": comment.parent_comment_id,
                    "replies": []
                }
            
            # Then, build the comment tree
            top_level_comments = []
            for comment_id, comment in comment_dict.items():
                if comment["parent_comment_id"] is None:
                    # This is a top-level comment
                    top_level_comments.append(comment)
                else:
                    # This is a reply to another comment
                    parent_id = comment["parent_comment_id"]
                    if parent_id in comment_dict:
                        comment_dict[parent_id]["replies"].append(comment)
            
            # Add top-level comments to the post
            post_dict["comments"] = top_level_comments
            
            results.append(post_dict)
            
        return results
        
    except Exception as e:
        import traceback
        print(f"Error in get_IDs_from_keywords: {str(e)}")
        print(traceback.format_exc())
        return []
    finally:
        if 'db' in locals():
            db.close()

def filter_topic_data(topicData):
    """
    Filters topic data to extract only the essential information needed by the LLM.
    
    Args:
        topicData (dict): The full topic data from the topic model analysis
        
    Returns:
        dict: Filtered topic data containing only sentiment categories and summaries
    """
    filtered_data = {
        "positive": [],
        "neutral": [],
        "negative": []
    }
    
    # Process each sentiment category
    for sentiment in ["positive", "neutral", "negative"]:
        if sentiment in topicData.get("topics", {}):
            for topic in topicData["topics"][sentiment].get("topics", []):
                # Extract only the essential information
                filtered_topic = {
                    "id": topic.get("id"),
                    "summary": topic.get("summary", "No summary available"),
                    "short_summary": topic.get("short_summary", "")
                }
                filtered_data[sentiment].append(filtered_topic)
    
    return filtered_data

if __name__ == "__main__":
    from util.llm_models.openai import get_openai_completion
    from util.prompts.mistral_prompt import extract_keywords_from_prompt

    prompt = "What people think of elon?"
    subreddit = "neu"

    with open("./app/routes/temp/0.topicData.json", "r") as f:
        topicData = json.load(f)
    
    topicData = filter_topic_data(topicData)
    # Get RAG results from vector search
    results = get_result(subreddit, prompt, topicData)
    print(results)
    
   
