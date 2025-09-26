import os
import logging
import json
import uuid
from typing import List, Dict, Any, Optional, Union
import numpy as np
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer
from util.device import get_torch_device
from app.db.config.database import SessionLocal
import psycopg2

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Define the embedding model to use - same as in BERTopic
SENTENCE_TRANSFORMER_MODEL = "all-mpnet-base-v2"

def get_sentence_transformer():
    """Get the SentenceTransformer model used in BERTopic."""
    # Use GPU if available, else CPU
    return SentenceTransformer(SENTENCE_TRANSFORMER_MODEL, device=get_torch_device())

def get_db_connection():
    """Get a database connection."""
    try:
        # Use the existing database connection from your app
        db = SessionLocal()
        return db
    except Exception as e:
        logger.error(f"Error connecting to database: {str(e)}")
        raise

def create_pgvector_tables():
    """Create necessary tables for PGVector if they don't exist."""
    try:
        db = get_db_connection()
        
        # Create extension if it doesn't exist
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                
        # Create table for embeddings with only the required columns
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS reddit_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subreddit TEXT NOT NULL,
                post_id TEXT NOT NULL,
                embedding vector(768)
            );
        """))
        
        # Create index for similarity search
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS reddit_embeddings_idx 
            ON reddit_embeddings USING ivfflat (embedding vector_cosine_ops) 
            WITH (lists = 100);
        """))
        
        db.commit()
        logger.info("PGVector tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error creating PGVector tables: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

def index_data_in_pgvector(subreddit: str, reddit_data: Optional[List[Dict]] = None, log_dir: Optional[str] = None) -> Dict[str, Union[bool, int, str]]:
    """Compatibility wrapper expected by routes to index data into PGVector.
    Creates tables if needed and stores embeddings for provided reddit_data.

    Returns a dict with keys: success, inserted, error (optional).
    """
    try:
        create_pgvector_tables()
        inserted = 0
        if reddit_data:
            inserted = store_reddit_data_in_pgvector(subreddit, reddit_data)
        return {"success": True, "inserted": inserted}
    except Exception as e:
        logger.error(f"index_data_in_pgvector failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"success": False, "inserted": 0, "error": str(e)}

def store_reddit_data_in_pgvector(subreddit: str, reddit_data: List[Dict]) -> int:
    """
    Store Reddit data in PostgreSQL with vector embeddings.
    
    Args:
        subreddit (str): The subreddit name
        reddit_data (List[Dict]): List of Reddit posts with their data
        
    Returns:
        int: Number of documents stored
    """
    try:
        # Initialize sentence transformer
        sentence_transformer = get_sentence_transformer()
        db = get_db_connection()
        
        # Prepare documents for storage
        documents = []
        post_ids = []
        debug_print("1_reddit_data.json", reddit_data)

        # First, check which post_ids already exist in the database
        existing_post_ids = set()
        result = db.execute(
            text("SELECT post_id FROM reddit_embeddings WHERE subreddit = :subreddit"),
            {"subreddit": subreddit}
        )
        for row in result:
            existing_post_ids.add(row[0])
        
        logger.info(f"Found {len(existing_post_ids)} existing posts for subreddit '{subreddit}'")

        for post in reddit_data:
            # Extract post data
            post_id = post.get('id')
            
            # # Skip if this post already exists in the database
            # if post_id in existing_post_ids:
            #     logger.info(f"Skipping existing post {post_id}")
            #     continue
                
            title = post.get('title', '')
            content = post.get('content', '')
            
            # Combine comments text
            comments = post.get('comments', [])
            comments_text = ""
            for comment in comments: 
                if 'body' in comment and comment['body']:
                    comments_text += comment['body'] + "\n"
            
            # Create document text by combining title, content, and comments
            full_text = f"{title} {content} {comments_text}".strip()
            
            # Only process if we have some text
            if full_text:
                documents.append(full_text)
                post_ids.append(post_id)
        
        # If no new documents to process, return early
        if not documents:
            logger.info(f"No new documents to index for subreddit '{subreddit}'")
            return 0
            
        # Generate embeddings with SentenceBERT
        logger.info(f"Generating embeddings for {len(documents)} documents")
        embeddings = sentence_transformer.encode(documents, show_progress_bar=True)
        
        
        debug_data = {
            "documents": documents,
            "post_ids": post_ids,
            "embeddings": embeddings
        }
        debug_print("2_embeddings.json", debug_data)

        # Insert new data
        count = 0
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch_end = min(i + batch_size, len(documents))
            batch_docs = documents[i:batch_end]
            batch_embeddings = embeddings[i:batch_end]
            batch_post_ids = post_ids[i:batch_end]
            
            for embedding, post_id in zip(batch_embeddings, batch_post_ids):
                # Only insert the required fields: subreddit, post_id, embedding
                db.execute(
                    text("""
                        INSERT INTO reddit_embeddings 
                        (subreddit, post_id, embedding)
                        VALUES (:subreddit, :post_id, :embedding)
                    """),
                    {
                        "subreddit": subreddit,
                        "post_id": post_id,
                        "embedding": embedding.tolist()
                    }
                )
                count += 1
            
            db.commit()
            logger.info(f"Inserted batch {i//batch_size + 1}/{(len(documents)-1)//batch_size + 1}")
        
        logger.info(f"Stored {count} documents in PGVector for subreddit '{subreddit}'")
        return count
    
    except Exception as e:
        logger.error(f"Error storing Reddit data in PGVector: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return 0
    finally:
        if 'db' in locals():
            db.close()

def query_pgvector(subreddit: str, query: str, top_k: int = 25):

    try:
        # Get database connection
        db = get_db_connection()
        
        model = get_sentence_transformer()
        
        query_embedding = model.encode(query)
        query_embedding_list = query_embedding.tolist()

        result = db.execute(
            text("""
                SELECT e.id, e.post_id, e.subreddit, 
                       e.embedding <=> CAST(:query_embedding AS vector) AS distance
                FROM reddit_embeddings e
                WHERE e.subreddit = :subreddit
                ORDER BY distance
                LIMIT :top_k
            """),
            {
                "query_embedding": query_embedding_list,
                "subreddit": subreddit,
                "top_k": top_k
            }
        )
        
        # Convert to list of dicts
        results = [dict(row) for row in result]
        
        logger.info(f"Found {len(results)} relevant documents for query in subreddit '{subreddit}'")
        return results
    except Exception as e:
        logger.error(f"Error querying PGVector: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return []
    finally:
        if 'db' in locals():
            db.close()

def get_rag_response(subreddit: str, prompt: str, top_k: int = 15):
    try:
        # Query PGVector for relevant documents
        vector_results = query_pgvector(subreddit, prompt, top_k)
        
        if not vector_results:
            logger.info("No relevant documents found")
            return []
        
        # Extract post_ids from vector search results
        post_ids = [result['post_id'] for result in vector_results]
        
        # Get database connection
        db = get_db_connection()
        
        # Query for posts and their comments
        from sqlalchemy.orm import joinedload
        from app.db.models.reddit_models import RedditPost, RedditComment
        
        # Fetch posts with their comments
        posts_with_comments = (
            db.query(RedditPost)
            .options(joinedload(RedditPost.comments))
            .filter(RedditPost.id.in_(post_ids))
            .all()
        )
        
        # Build the response structure
        results = []
        for post in posts_with_comments:
            # Create a dictionary for the post
            post_dict = {
                "id": post.id,
                "title": post.title,
                "content": post.content,
                "score": post.score,
                "created_utc": post.created_utc,
                # "url": post.url,
                # "permalink": post.permalink,
                # "num_comments": post.num_comments,
                # "author": post.author,
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
                    # "author": comment.author,
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
        debug_print("4_rag_results.json", results)

        logger.info(f"Retrieved {len(results)} posts with their comments")
        return results
        
    except Exception as e:
        logger.error(f"Error in get_rag_response: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return []
    finally:
        if 'db' in locals():
            db.close()


def clear_pgvector_data():
    """
    Delete all data from the PGVector tables.
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        db = get_db_connection()
        
        # Truncate the reddit_embeddings table
        db.execute(text("TRUNCATE TABLE reddit_embeddings;"))
        
        db.commit()
        logger.info("PGVector data cleared successfully")
        return True
    except Exception as e:
        logger.error(f"Error clearing PGVector data: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close() 

def debug_print(path: str, data: Any):
    prior_path = "./util/llm_models/pgvector/temp/"
    os.makedirs(os.path.dirname(prior_path + path), exist_ok=True)  # Create directory if not exists
    
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


def rag_test():
    results = get_rag_response("ouraring", "What problems are users experiencing?")
    

    debug_print("3_rag_results.json", results)

    
    print("[bn-pgvector]:", results)

if __name__ == "__main__":
    rag_test()
