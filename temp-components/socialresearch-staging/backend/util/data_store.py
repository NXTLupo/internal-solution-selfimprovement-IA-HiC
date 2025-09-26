"""
Utility for storing and retrieving data from PostgreSQL database
"""
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.db.config.database import SessionLocal
from app.repositories.reddit_repository import RedditRepository

logger = logging.getLogger(__name__)

def save_reddit_data(subreddit: str, data: Dict[str, Any]) -> None:
    """Save Reddit data to the database."""
    db = SessionLocal()
    try:
        repo = RedditRepository(db)
        
        # Create a search entry if it doesn't exist
        search_id = f"{subreddit}_cache"
        search = repo.get_search_by_id(search_id)
        
        if not search:
            search = repo.save_search(
                search_id=search_id,
                subreddit=subreddit,
                query=None,  # This is cached data, not from a specific query
                parameters={"type": "cache", "subreddit": subreddit}
            )
        
        # Save the posts
        if 'raw_data' in data and data['raw_data']:
            repo.save_posts(search_id, data['raw_data'])
            
    except Exception as e:
        logger.error(f"Error saving Reddit data to database: {str(e)}")
        raise
    finally:
        db.close()

def get_reddit_data(subreddit: str) -> Optional[Dict[str, Any]]:
    """Get Reddit data from the database."""
    db = SessionLocal()
    try:
        repo = RedditRepository(db)
        search_id = f"{subreddit}_cache"
        search = repo.get_search_by_id(search_id)
        
        if not search:
            return None
            
        posts = repo.get_posts_by_search_id(search_id)
        
        # Convert to the expected format
        result = {
            "subreddit": subreddit,
            "raw_data": []
        }
        
        for post in posts:
            post_data = {
                "id": post.id,
                "title": post.title,
                "content": post.content,
                "score": post.score,
                "created_utc": post.created_utc,
                "url": post.url,
                "permalink": post.permalink,
                "num_comments": post.num_comments,
                "author": post.author,
                "comments": []
            }
            
            for comment in post.comments:
                comment_data = {
                    "id": comment.id,
                    "body": comment.body,
                    "score": comment.score,
                    "created_utc": comment.created_utc,
                    "author": comment.author
                }
                post_data["comments"].append(comment_data)
                
            result["raw_data"].append(post_data)
            
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving Reddit data from database: {str(e)}")
        return None
    finally:
        db.close()

def get_all_subreddits() -> List[str]:
    """Get a list of all subreddits in the database."""
    db = SessionLocal()
    try:
        searches = db.query(RedditSearch.subreddit).distinct().all()
        return [search[0] for search in searches if search[0]]
    except Exception as e:
        logger.error(f"Error retrieving subreddits from database: {str(e)}")
        return []
    finally:
        db.close()

def extract_keywords_from_query(query, max_keywords=5):
    """
    Extract relevant keywords from a user query.
    This is a simple implementation - in a real system, you might use NLP or an LLM.
    
    Args:
        query (str): The user's query
        max_keywords (int): Maximum number of keywords to extract
        
    Returns:
        list: List of extracted keywords
    """
    # List of common words to exclude
    stopwords = {'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
                'in', 'on', 'at', 'to', 'for', 'with', 'about', 'what', 'how', 
                'when', 'where', 'why', 'who', 'which', 'do', 'does', 'did', 'have', 
                'has', 'had', 'can', 'could', 'will', 'would', 'should', 'may', 'might'}
    
    # Convert to lowercase and split into words
    words = re.findall(r'\b\w+\b', query.lower())
    
    # Filter out stopwords and short words
    keywords = [word for word in words if word not in stopwords and len(word) > 2]
    
    # Return up to max_keywords unique keywords
    return list(dict.fromkeys(keywords))[:max_keywords] 