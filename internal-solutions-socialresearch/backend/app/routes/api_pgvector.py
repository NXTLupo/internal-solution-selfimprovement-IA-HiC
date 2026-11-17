import json
import os
import re
from typing import Any

from flask import Blueprint, jsonify, request
from flask_cors import CORS

# Database imports
from app.db.config.database import get_db
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

# Utility imports
from util.llm_models.claude import get_claude_completion
from util.llm_models.openai import get_openai_completion
from util.llm_models.pgvector.pgvector import get_rag_response

# Database imports
from app.db.config.database import get_db
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

# Utility imports
from util.llm_models.claude import get_claude_completion
from util.llm_models.openai import get_openai_completion
# from util.llm_models.gemini import get_gemini_completion, get_gemini_2_5_completion
from util.llm_models.pgvector.pgvector import get_rag_response
from util.prompts.mistral_prompt import extract_keywords_from_prompt

from util.prompts.rag_prompt import get_rag_prompt
from util.prompts.mistral_prompt import extract_keywords_from_prompt

# Model imports
from app.db.models.reddit_models import RedditPost, RedditComment

# Model imports
from app.db.models.reddit_models import RedditPost, RedditComment

# Third-party libraries
import numpy as np

rag_bp = Blueprint('rag', __name__)
CORS(rag_bp)

def clear_temp_directory():
    """
    Clears all files in the temp directory.
    Called at the beginning of each API call to ensure clean debug files.
    """
    temp_dir = "./app/routes/temp/"
    try:
        # Create the directory if it doesn't exist
        os.makedirs(temp_dir, exist_ok=True)
        
        # Remove all files in the directory
        for filename in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, filename)
            if os.path.isfile(file_path):
                os.unlink(file_path)
    except Exception as e:
        pass

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
    }
    """
    try:
        # Clear temp directory for fresh debug files
        clear_temp_directory()
        
        # Handle both JSON and form data
        if request.is_json:
            data = request.json
        else:
            data = request.form
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract required parameters
        prompt = data.get('prompt')
        subreddit = data.get('subreddit')
        topicData = data.get('topicData')
        model = data.get('model', "claude")
        
        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400
        
        if not subreddit:
            return jsonify({"error": "No subreddit provided"}), 400
        
        # Check if the provided subreddit exists in our database
        from sqlalchemy import func
        from app.db.models.reddit_models import RedditPost
        from app.db.config.database import get_db
        
        db = next(get_db())
        try:
            # Count posts for this subreddit - CASE INSENSITIVE MATCH
            subreddit_count = db.query(func.count(RedditPost.id)).filter(
                func.lower(RedditPost.subreddit) == subreddit.lower()
            ).scalar()
        except Exception as e:
            pass
        finally:
            db.close()
        
        # Process the topic data
        try:
            if isinstance(topicData, str):
                topicData = json.loads(topicData)
            elif topicData is None:
                # Create an empty topic data structure
                topicData = {
                    "topics": {
                        "positive": {"topics": []},
                        "neutral": {"topics": []},
                        "negative": {"topics": []}
                    }
                }
        except Exception as e:
            return jsonify({"error": f"Invalid topicData format: {str(e)}"}), 400
        
        # Filter topic data to only include essential information
        filtered_topic_data = filter_topic_data(topicData)
        debug_print("0.topicData.json", filtered_topic_data)
        
        # Get RAG response
        response = get_result(subreddit, prompt, filtered_topic_data, model)

        return jsonify(response), 200
    
    except Exception as e:
        import traceback
        return jsonify({"error": str(e)}), 500

def get_result(subreddit: str, prompt: str, topicData: dict, model: str) -> dict:
    """
    Gets the RAG results for a given subreddit and prompt.
    
    Args:
        subreddit (str): The subreddit to search in
        prompt (str): The user's query
        topicData (dict): Topic modeling data for context
        
    Returns:
        dict: Dictionary containing the answer and sources
    """
    # Vector search
    rag_results = get_rag_response(subreddit, prompt, 15)
    debug_print("1.rag_results.json", rag_results)

    # Get keyword search results (now returns JSON)
    keyword_results_json = get_keyword_response(subreddit, prompt, 10)
    
    # Parse the JSON string back to a Python dictionary
    try:
        keyword_results = json.loads(keyword_results_json)
        debug_print("2.keyword_results.json", keyword_results)
    except json.JSONDecodeError as e:
        keyword_results = {"posts": [], "keywords": [], "post_ids": []}
    
    # Process the vector search results
    processed_rag_results = process_rag_results(rag_results)
    debug_print("3.processed_rag_results.json", processed_rag_results)
    
    # Process the keyword search results if posts are available
    if keyword_results.get("posts"):
        keyword_processed_results = process_keyword_results(keyword_results["posts"])
        
        # Combine both result sets, avoiding duplicates by post ID
        existing_post_ids = [result["id"] for result in processed_rag_results]
        for result in keyword_processed_results:
            if result["id"] not in existing_post_ids:
                processed_rag_results.append(result)
                existing_post_ids.append(result["id"])
                
        debug_print("3.5.combined_processed_results.json", processed_rag_results)
    
    # Prepare the prompt with topics
    prompt_with_topics = get_rag_prompt(prompt, processed_rag_results, topicData)
    debug_print("4.prompt.json", prompt_with_topics)
    messages = [{"role": "user", "content": prompt_with_topics}]
    
    # Get LLM response from Claude Opus 5.5 (util/llm_models/claude.py). The `model` form
    # field is legacy: the markdown answer prompt cannot run through get_openai_completion,
    # which forces JSON mode.
    llm_response = get_claude_completion(messages)
    
    debug_print("5.response.json", llm_response)
    
    return llm_response

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

def process_keyword_results(keyword_posts: list) -> list:

    """
    Process keyword search results to format them for RAG.
    
    Args:
        keyword_posts (list): List of posts from keyword search
        
    Returns:
        list: List of processed posts in the same format as process_rag_results
    """
    processed_results = []
    
    for post in keyword_posts:
        # Create markdown formatted content
        title = post.get('title', '')
        content = post.get('content', '')
        post_id = post.get('id', '')
        matched_in = post.get('matched_in', [])
        matching_keywords = post.get('matching_keywords', [])
        
        # Remove any links from content
        content = re.sub(r'https?://\S+', '', content).strip()
        
        # Add the post ID and keyword information at the top
        markdown_content = f"# Post {post_id}: {title}\n\n"
        markdown_content += f"**Matched keywords**: {', '.join(matching_keywords)}\n"
        markdown_content += f"**Found in**: {', '.join(matched_in)}\n\n"
        markdown_content += f"{content}\n\n"
        
        # Process comments if they exist
        if post.get('comments'):
            markdown_content += "## Comments:\n\n"
            
            # Process all comments
            for comment in post.get('comments', []):
                if comment.get('body') == '[deleted]':
                    continue
                    
                # Remove any links from comment body
                comment_body = re.sub(r'https?://\S+', '', comment.get('body', '')).strip()
                comment_id = comment.get('id', '')
                matched = comment.get('matched', False)
                
                # Format with markdown, highlighting matched comments
                prefix = "- "
                if matched:
                    comment_text = f"{prefix}**Matched Comment {comment_id}**: {comment_body}\n"
                else:
                    comment_text = f"{prefix}Comment {comment_id}: {comment_body}\n"
                
                markdown_content += comment_text
        
        processed_item = {
            'id': post_id,
            'markdown_content': markdown_content.strip()
        }
        
        processed_results.append(processed_item)
    
    return processed_results

def get_keyword_response(subreddit: str, prompt: str, number_of_documents: int):
    """
    Gets the keyword results for a given subreddit and prompt.
    
    Args:
        subreddit (str): The subreddit to search in
        prompt (str): The user's query
        number_of_documents (int): Number of documents to return
        
    Returns:
        str: JSON string containing posts and comments that match the keywords
    """
    # Extract keywords from the prompt
    keyword_prompt = extract_keywords_from_prompt(prompt)
    
    # Get the keywords from Claude (plain comma-separated text; low effort, it is a short extraction)
    keyword_response = get_claude_completion(messages=[{"role": "user", "content": keyword_prompt}], effort="low", max_tokens=2000)
    debug_print("5.llm_keywords_results.json", keyword_response)
    
    # Parse the keywords from the response
    keywords = []
    
    # Handle string response (OpenAI may return direct string in some cases)
    if isinstance(keyword_response, str):
        content = keyword_response.strip()
        
        # Clean up the content
        content = content.strip('`"\' \n\t')
        
        # Process keywords
        if ',' in content:
            keywords = [k.strip() for k in content.split(',') if k.strip()]
        else:
            # Single keyword or phrase (like "student hub")
            single_keyword = content.strip()
            if single_keyword:
                keywords = [single_keyword]
    
    # Handle dictionary response (OpenAI typically returns dict with "content" key)
    elif isinstance(keyword_response, dict) and "content" in keyword_response:
        content = keyword_response["content"].strip()
        
        # Clean up the content
        content = content.strip('`"\' \n\t')
        
        # Process keywords
        if ',' in content:
            keywords = [k.strip() for k in content.split(',') if k.strip()]
        else:
            # Single keyword or phrase (like "student hub")
            single_keyword = content.strip()
            if single_keyword:
                keywords = [single_keyword]
        
    debug_print("6.extracted_keywords.json", keywords)

    # If no keywords found, return empty result as JSON
    if not keywords:
        empty_result = {
            "keywords": [],
            "post_ids": [],
            "posts": []
        }
        return json.dumps(empty_result)
    
    try:
        # Query the database for posts containing these keywords
        db = next(get_db())
        
        # Dictionary to track post matches by keyword
        matching_posts_by_keyword = []
        
        # Dictionary to hold our result posts, indexed by post_id
        result_posts = {}
        
        # 1. First search for keywords in posts (titles and content)
        for keyword in keywords:
            # Ensure we have a string, not another data type
            if not isinstance(keyword, str):
                keyword = str(keyword)
                
            # Trim any remaining quotes or whitespace
            keyword = keyword.strip().strip('"\'')
            
            if not keyword:
                continue
                
            # Search for the keyword in post titles and content
            # Using case-insensitive search and eager loading of comments
            posts = db.query(RedditPost).options(
                joinedload(RedditPost.comments)
            ).filter(
                func.lower(RedditPost.subreddit) == subreddit.lower(),
                or_(
                    func.lower(RedditPost.title).contains(func.lower(keyword)),
                    func.lower(RedditPost.content).contains(func.lower(keyword))
                )
            ).limit(number_of_documents).all()
            
            # Extract post IDs
            post_ids = [post.id for post in posts]
            
            # Add to our tracking
            matching_posts_by_keyword.append({
                "keyword": keyword,
                "post_ids": post_ids
            })
            
            # Add each post to our results dictionary
            for post in posts:
                if post.id not in result_posts:
                    # Create a new entry
                    result_posts[post.id] = {
                        "id": post.id,
                        "title": post.title,
                        "content": post.content,
                        "matched_in": ["post"],  # Track where the match was found
                        "matching_keywords": [keyword],  # Track which keywords matched
                        "comments": []
                    }
                else:
                    # Update existing entry
                    if "post" not in result_posts[post.id]["matched_in"]:
                        result_posts[post.id]["matched_in"].append("post")
                    if keyword not in result_posts[post.id]["matching_keywords"]:
                        result_posts[post.id]["matching_keywords"].append(keyword)
                
                # Add comments (if they exist)
                if post.comments:
                    for comment in post.comments:
                        result_posts[post.id]["comments"].append({
                            "id": comment.id,
                            "body": comment.body,
                            "author": comment.author,
                            "matched": False  # Not matched by keyword (yet)
                        })
        
        # 2. Search for keywords in comments
        comment_matches_by_keyword = []
        
        for keyword in keywords:
            if not isinstance(keyword, str):
                keyword = str(keyword)
                
            keyword = keyword.strip().strip('"\'')
            
            if not keyword:
                continue
                
            # Search for the keyword in comment bodies
            # Using case-insensitive search and joining with RedditPost to filter by subreddit
            comments = db.query(RedditComment).join(
                RedditPost, RedditComment.post_id == RedditPost.id
            ).filter(
                func.lower(RedditPost.subreddit) == subreddit.lower(),
                func.lower(RedditComment.body).contains(func.lower(keyword))
            ).limit(number_of_documents).all()
            
            # Extract comment and post IDs
            comment_ids = [comment.id for comment in comments]
            post_ids = [comment.post_id for comment in comments]
            
            # Add to our tracking
            comment_matches_by_keyword.append({
                "keyword": keyword,
                "comment_ids": comment_ids,
                "post_ids": post_ids
            })
            
            # Process each comment match
            for comment in comments:
                post_id = comment.post_id
                
                # Check if we already have this post in our results
                if post_id not in result_posts:
                    # We need to fetch the post data
                    post = db.query(RedditPost).filter(RedditPost.id == post_id).first()
                    
                    if post:
                        result_posts[post_id] = {
                            "id": post.id,
                            "title": post.title,
                            "content": post.content,
                            "matched_in": ["comment"],  # Match found in comment
                            "matching_keywords": [keyword],
                            "comments": []
                        }
                else:
                    # Post already exists, update match info
                    if "comment" not in result_posts[post_id]["matched_in"]:
                        result_posts[post_id]["matched_in"].append("comment")
                    if keyword not in result_posts[post_id]["matching_keywords"]:
                        result_posts[post_id]["matching_keywords"].append(keyword)
                
                # Check if we already have this comment in our result post
                comment_exists = False
                for i, existing_comment in enumerate(result_posts[post_id]["comments"]):
                    if existing_comment["id"] == comment.id:
                        # Update the comment to indicate it matched a keyword
                        result_posts[post_id]["comments"][i]["matched"] = True
                        comment_exists = True
                        break
                
                # If comment doesn't exist in our results yet, add it
                if not comment_exists:
                    result_posts[post_id]["comments"].append({
                        "id": comment.id,
                        "body": comment.body,
                        "author": comment.author,
                        "matched": True  # Matched by keyword
                    })
        
        # 3. Convert the dictionary to a list for return
        result_posts_list = list(result_posts.values())
        
        # 4. Limit to the specified number of documents
        result_posts_list = result_posts_list[:number_of_documents]
        
        # Create the combined result as a dictionary
        result_dict = {
            "keywords": keywords,
            "keyword_post_matches": matching_posts_by_keyword,
            "keyword_comment_matches": comment_matches_by_keyword,
            "post_ids": [post["id"] for post in result_posts_list],
            "posts": result_posts_list
        }
        
        # Convert dictionary to JSON format
        result_json = json.dumps(result_dict)
        debug_print("7.keyword_search_results.json", result_dict)
        
        return result_json
        
    except Exception as e:
        import traceback
        error_result = {
            "keywords": keywords,
            "error": str(e),
            "post_ids": [],
            "posts": []
        }
        # Return error as JSON format
        return json.dumps(error_result)
    finally:
        if 'db' in locals():
            db.close()

def debug_print(path: str, data: Any):
    prior_path = "./app/routes/rag/"
    os.makedirs(os.path.dirname(prior_path + path), exist_ok=True)

    def numpy_to_list(obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: numpy_to_list(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [numpy_to_list(item) for item in obj]
        else:
            return obj

    serializable_data = numpy_to_list(data)

    # Write to file
    with open(prior_path + path, "w", encoding="utf-8") as f:
        json.dump(serializable_data, f, ensure_ascii=False, indent=2)

    return serializable_data

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
                    "one_sentence_summary": topic.get("one_sentence_summary", ""),
                    "short_summary": topic.get("short_summary", "")
                }
                filtered_data[sentiment].append(filtered_topic)
    
    return filtered_data

if __name__ == "__main__":
    from util.llm_models.openai import get_openai_completion

    prompt = "What people think of student hub?"
    subreddit = "neu"

    # Clear temp directory first
    clear_temp_directory()
    
    # Create an empty topic data structure instead of reading from a file
    topicData = {
        "topics": {
            "positive": {"topics": []},
            "neutral": {"topics": []},
            "negative": {"topics": []}
        }
    }

    
    # Filter the empty topic data
    filtered_topic_data = filter_topic_data(topicData)
    debug_print("0.topicData.json", filtered_topic_data)
    


    # Run keyword extraction and search using our enhanced function
    keyword_results = get_keyword_response(subreddit, prompt, 10)
    
    # Process the keyword results for RAG
    posts_count = len(keyword_results.get("posts", []))
    if posts_count > 0:
        processed_results = process_keyword_results(keyword_results.get("posts", []))
    
    # Test the combined processing in get_result
    full_result = get_result(subreddit, prompt, filtered_topic_data)


    
   
