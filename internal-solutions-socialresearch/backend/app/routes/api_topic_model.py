from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
import json
import os
from flask_cors import CORS
from util.topic_model.BertTopic import analyze_topics, summarize_topics, analyze_topic_sentiment, calculate_topic_similarities
from util.topic_model.user_engament import extract_engagement_metrics
from app.db.config.database import SessionLocal
from app.repositories.reddit_repository import RedditRepository
import praw
from dotenv import load_dotenv
from threading import Thread
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.repositories.jobs_repositories import JobsRepository, update_job_status, generate_job_id
import traceback
import logging
from util.prompts.topic_prompt import get_sentiment_evidence_prompt
from util.llm_models.openai import get_openai_completion
import gc

topic_model_bp = Blueprint('topic_model', __name__)
CORS(topic_model_bp)

# Load environment variables from .env file
load_dotenv()

# Initialize Reddit API client
reddit = praw.Reddit(
    client_id=os.getenv('REDDIT_CLIENT_ID'),
    client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
    user_agent=os.getenv('REDDIT_USER_AGENT'),
)

@topic_model_bp.route('/analyze-async', methods=['POST'])
def analyze_topic_model_async():
    """
    Asynchronous version of the topic model analysis endpoint.
    Creates a job and processes it in the background.
    """
    data = request.get_json()
    subreddit = data.get('subreddit')
    num_posts = data.get('num_posts', 800)
    max_comments_per_post = data.get('max_comments', 3)
    index_in_pgvector = data.get('index_in_pgvector', True)
    sort = data.get('sort', 'relevance')
    user_id = data.get('user_id', '123')
    project_id = data.get('project_id')
    keyword = data.get('keyword', '')

    # limitations for debugging
    summary_limit = data.get('summary_limit', None)
    topics_limit = data.get('topics_limit', None)
    
    # Convert to integers if provided
    if summary_limit is not None:
        try:
            summary_limit = int(summary_limit)
        except (ValueError, TypeError):
            summary_limit = None
            
    if topics_limit is not None:
        try:
            topics_limit = int(topics_limit)
        except (ValueError, TypeError):
            topics_limit = None

    if not subreddit:
        return jsonify({'error': 'Subreddit name is required'}), 400
    
    try:
        # Generate a unique job ID
        job_id = generate_job_id()
        
        # Create a job record in database
        db = SessionLocal()
        try:
            # Create JobsRepository instance
            jobs_repo = JobsRepository(db)
            
            # Job parameters to store
            job_parameters = {
                'subreddit': subreddit,
                'num_posts': num_posts,
                'max_comments_per_post': max_comments_per_post,
                'index_in_pgvector': index_in_pgvector,
                'sort': sort,
                'project_id': project_id,
                'keyword': keyword,
                'summary_limit': summary_limit
            }
            
            # Create job in database
            job = jobs_repo.create_job(
                job_id=job_id,
                user_id=user_id,
                parameters=job_parameters
            )
        except Exception as e:
            print(f"Error creating job in database: {str(e)}")
            return jsonify({'error': f'Failed to create job: {str(e)}'}), 500
        finally:
            db.close()
            # Explicitly dispose of the session after use
            del jobs_repo
            gc.collect()
        
        # Start background thread to process the job
        thread = Thread(
            target=process_topic_model_job,
            args=(
                job_id,
                subreddit,
                num_posts,
                max_comments_per_post,
                index_in_pgvector,
                sort,
                user_id,
                project_id,
                summary_limit,
                topics_limit,
                keyword
            )
        )
        thread.daemon = True  # Set as daemon so it doesn't block app shutdown
        thread.start()
        
        # Immediately return the job ID and status
        return jsonify({
            'job_id': job_id,
            'status': 'pending',
            'message': 'Topic modeling job submitted and queued for processing'
        }), 202  # Return 202 Accepted for async operations
        
    except Exception as e:
        error_msg = f"Error submitting topic modeling job: {str(e)}"
        error_trace = traceback.format_exc()
        print(f"{error_msg}\n{error_trace}")
        
        # Clean up any resources that might have been allocated
        if 'job_id' in locals():
            del job_id
        if 'job_parameters' in locals():
            del job_parameters
        
        # Force garbage collection
        gc.collect()
        
        return jsonify({'error': error_msg}), 500

def process_topic_model_job(
    job_id, 
    subreddit,
    num_posts,
    max_comments_per_post,
    index_in_pgvector,
    sort,
    user_id,
    project_id,
    summary_limit,
    topics_limit,
    keyword=''
    
):
    """Process the topic modeling job in the background"""
    try:
        # Update job status to processing
        update_job_status(job_id, 'processing', 'Setting up topic modeling environment')
        
        # Create timestamp and log directory
        timestamp = datetime.now().strftime("%d_%H_%M")  
        log_dir = os.path.join(os.getenv('TOPIC_LOG_DIR', './log_topic'))
        os.makedirs(log_dir, exist_ok=True)
        
        # Delete all files in log_dir if it exists
        if os.path.exists(log_dir):
            for file in os.listdir(log_dir):
                file_path = os.path.join(log_dir, file)
                if os.path.isfile(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        print(f"Failed to remove file {file_path}: {e}")
        
        # STEP 1: Fetch Reddit posts
        update_job_status(job_id, 'processing', 'Fetching posts from Reddit', progress=8)
        
        # Check if keyword is provided and use the appropriate function
        if keyword:
            new_posts_from_api = fetch_reddit_posts_with_keyword(
                subreddit=subreddit,
                keyword=keyword,
                num_posts=num_posts,
                max_comments_per_post=max_comments_per_post,
                log_dir=log_dir,
                sort=sort
            )
            
            # STEP 2: Save posts to database
            save_posts_to_database(subreddit, new_posts_from_api)
            
            # For keyword searches, we only want to analyze the posts directly from the API
            # instead of retrieving from the database
            raw_reddit_data = new_posts_from_api
            existing_post_ids = set(post['id'] for post in new_posts_from_api)
            
            # Log step 2: Data collection complete for keyword search
            with open(os.path.join(log_dir, '2_data_collection_complete.log'), 'w', encoding='utf-8') as f:
                f.write(f"Timestamp: {datetime.now().isoformat()}\n")
                f.write(f"Completed data collection for subreddit: {subreddit} with keyword: {keyword}\n")
                f.write(f"Posts fetched: {len(new_posts_from_api)}\n")
                f.write(f"Posts that will be analyzed: {len(raw_reddit_data)}\n\n")
                
        else:
            # No keyword - use the standard approach
            new_posts_from_api = fetch_reddit_posts(
                subreddit=subreddit,
                num_posts=num_posts,
                max_comments_per_post=max_comments_per_post,
                log_dir=log_dir,
                sort=sort
            )
            
            # STEP 2: Save posts to database
            save_posts_to_database(subreddit, new_posts_from_api)
        
            # STEP 3: Retrieve all posts for this subreddit from the database and process them
            update_job_status(job_id, 'processing', 'Retrieving posts from database', progress=9)
            raw_reddit_data, existing_post_ids = retrieve_posts_from_database(subreddit, log_dir)
            
            # Log step 2: Data collection complete
            log_data_collection_complete(log_dir, subreddit, new_posts_from_api, raw_reddit_data)
        
        # STEP 4: Process all data to build document corpus
        update_job_status(job_id, 'processing', 'Processing posts for analysis', progress=11)
        documents, post_ids, scores, post_data = process_posts_for_analysis(raw_reddit_data, max_comments_per_post)
        
        # Log sample data
        log_post_samples(log_dir, post_data, documents)

        # STEP 5: Perform topic modeling
        topic_model, topics, _ = analyze_topics(documents, post_ids, scores)
        topic_info = topic_model.get_topic_info()

        # Calculate topic similarities
        update_job_status(job_id, 'processing', 'Calculating topic similarities', progress=60)
        topic_similarities = calculate_topic_similarities(topic_model, topic_info)
        
        # Log step 4: Topic modeling results
        with open(os.path.join(log_dir, '4_topic_modeling_results.json'), 'w', encoding='utf-8') as f:
            topic_data = []
            for topic in topic_info.itertuples():
                if topic.Topic != -1:  
                    topic_terms = [{"term": str(term), "weight": float(weight)} 
                                  for term, weight in topic_model.get_topic(topic.Topic)]
                    topic_data.append({
                        "topic_id": int(topic.Topic),
                        "count": int(topic.Count),
                        "name": str(topic.Name),
                        "representation": topic_terms[:10]  # Top 10 terms
                    })
            
            json.dump({
                "total_topics": len(topic_info[topic_info['Topic'] != -1]),
                "topics": topic_data
            }, f, indent=2)
        
        # Initialize response structure
        response = {
            'total_documents': len(documents),
            'total_topics': len(topic_info[topic_info['Topic'] != -1]),
            'topics': {
                'positive': {'count': 0, 'topics': []},
                'negative': {'count': 0, 'topics': []},
                'neutral': {'count': 0, 'topics': []}
            },
            'topic_similarities': topic_similarities,
            'topic_ids': topic_info[topic_info['Topic'] != -1]['Topic'].tolist()
        }
        
        # STEP 6: Generate topic summaries
        update_job_status(job_id, 'processing', 'Generating summaries for top topics', progress=85)
        topic_summaries = summarize_topics(topic_model, topics, documents, summary_limit, keyword=keyword)
        
        # Log step 6: Topic summaries results
        with open(os.path.join(log_dir, '6_topic_summaries_results.json'), 'w', encoding='utf-8') as f:
            json.dump(topic_summaries, f, indent=2)
        

        # STEP 7: Process top topics and perform sentiment analysis
        update_job_status(job_id, 'processing', 'Processing topics and performing sentiment analysis', progress=70)
        sentiment_results, topic_engagement_metrics = process_top_topics(
            topic_model, topic_info, topics, documents, post_ids, post_data, topic_summaries,
            response, log_dir, topics_limit, job_id
        )
        
        # Log step 8: Sentiment analysis results
        with open(os.path.join(log_dir, '8_sentiment_analysis_results.json'), 'w', encoding='utf-8') as f:
            json.dump(sentiment_results, f, indent=2)
        
        # Log topic engagement metrics
        with open(os.path.join(log_dir, '3_1_topic_engagement_metrics.json'), 'w', encoding='utf-8') as f:
            json.dump(topic_engagement_metrics, f, indent=2)


        # Log step 9: Final response
        with open(os.path.join(log_dir, '9_final_response.json'), 'w', encoding='utf-8') as f:
            json.dump(response, f, indent=2)
        
        # New log entry for total documents and topics
        with open(os.path.join(log_dir, 'total_documents_and_topics.log'), 'w', encoding='utf-8') as f:
            f.write(f"Total Documents: {len(documents)}\n")
            f.write(f"Total Topics: {len(topic_info[topic_info['Topic'] != -1])}\n")
        

        # After collecting post data, extract engagement metrics
        update_job_status(job_id, 'processing', 'Extracting engagement metrics', progress=95)
        engagement_metrics = extract_engagement_metrics(post_data)
        
        # Log engagement metrics
        with open(os.path.join(log_dir, '3_engagement_metrics.json'), 'w', encoding='utf-8') as f:
            json.dump(engagement_metrics, f, indent=2)
        
        # Add engagement metrics to the response
        response['engagement_metrics'] = engagement_metrics
        response['topic_engagement_metrics'] = topic_engagement_metrics
        
        # Add keyword information to the response if provided
        if keyword:
            response['keyword'] = keyword
        
        # Index in pgvector if requested
        if index_in_pgvector:
            update_job_status(job_id, 'processing', 'Indexing data in pgvector', progress=96)
            pgvector_result = index_data_in_pgvector(subreddit, raw_reddit_data, log_dir)
            response['pgvector_indexing'] = pgvector_result
        
        # Save analysis result to database
        update_job_status(job_id, 'processing', 'Saving results to database', progress=99)
        db = SessionLocal()
        try:
            repo = RedditRepository(db)
            
            # Save analysis result using repository method
            analysis_id = repo.save_analysis_result(
                user_id=user_id,
                data=response,
                analysis_type='topic_model',
                subreddit=subreddit,
                topic=subreddit,  # Using subreddit as topic name
                post_count=len(documents),
                sort_by=sort,
                time_period='',  # No time period specified in this API
                project_id=project_id
            )
            
            print(f"[topic_model.py] Analysis result saved to database with ID: {analysis_id}")
            
            # Add the analysis ID to the response
            response['analysis_id'] = analysis_id
            
            # Update job status to completed with the analysis ID
            jobs_repo = JobsRepository(db)
            jobs_repo.update_job_status(
                job_id=job_id,
                status='completed',
                message='Topic modeling completed successfully',
                progress=100,
                analysis_id=analysis_id
            )
            
        finally:
            db.close()
        
        # Clean up large objects to free memory
        del topic_model
        del documents
        del post_data
        del raw_reddit_data
        del topic_info
        del topics
        del topic_summaries
        
        # Force garbage collection
        gc.collect()
            
    except Exception as e:
        error_message = str(e)
        error_trace = traceback.format_exc()
        print(f"[topic_model.py] Error in topic modeling job: {error_message}\n{error_trace}")
        
        if 'log_dir' in locals():
            with open(os.path.join(log_dir, 'error.log'), 'w', encoding='utf-8') as f:
                f.write(f"Timestamp: {datetime.now().isoformat()}\n")
                f.write(f"Error: {error_message}\n")
                f.write(f"\nTraceback:\n{error_trace}")
        
        # Update job status to failed
        update_job_status(
            job_id=job_id, 
            status='failed', 
            message='Topic modeling failed', 
            error=error_message
        )
        
        # Clean up in case of error to free memory
        for var_name in ['topic_model', 'documents', 'post_data', 'raw_reddit_data', 'topic_info', 'topics', 'topic_summaries']:
            if var_name in locals():
                del locals()[var_name]
        
        # Force garbage collection
        gc.collect()

def fetch_reddit_posts(subreddit, num_posts, max_comments_per_post, log_dir, sort='relevance'):
    """
    Fetches posts from a specified subreddit using the Reddit API.
    
    Args:
        subreddit (str): The subreddit name to fetch posts from
        num_posts (int): Maximum number of posts to fetch
        max_comments_per_post (int): Maximum number of comments to fetch per post
        log_dir (str): Directory to save logs
        sort (str): Sorting method for posts ('relevance', 'new', 'hot')
        
    Returns:
        list: List of collected Reddit posts with their comments
    """
    # Log step 1: Data collection start
    with open(os.path.join(log_dir, '1_data_collection_start.log'), 'w', encoding='utf-8') as f:
        f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        f.write(f"Starting data collection for subreddit: {subreddit}\n")
        f.write(f"Target post count: {num_posts}\n")
        f.write(f"Max comments per post: {max_comments_per_post}\n")
    
    # STEP 1: Fetch fresh data from Reddit API first
    print("[topic_model.py] reddit instance inited, fetching fresh posts")
    subreddit_instance = reddit.subreddit(subreddit)
    new_posts_from_api = []
    
    # Get top posts from Reddit
    if sort == 'relevance':
        raw_data = subreddit_instance.top(limit=min(num_posts, num_posts * 2))
    elif sort == 'new':
        raw_data = subreddit_instance.new(limit=min(num_posts, num_posts * 2))
    elif sort == 'hot':
        raw_data = subreddit_instance.hot(limit=min(num_posts, num_posts * 2))
    else:
        raw_data = subreddit_instance.top(limit=min(num_posts, num_posts * 2))
    
    for submission in raw_data:
        title = submission.title
        content = submission.selftext if hasattr(submission, 'selftext') else ''
        
        created_utc = submission.created_utc
        timestamp = datetime.fromtimestamp(created_utc).strftime('%Y-%m-%d %H:%M:%S')
        
        submission_data = {
            'id': submission.id,
            'title': title,
            'content': content,
            'score': submission.score,
            'created_utc': created_utc,
            'url': submission.url,
            'permalink': submission.permalink,
            'num_comments': submission.num_comments,
            'author': str(submission.author) if submission.author else '[deleted]',
            'comments': []
        }
        
        submission.comments.replace_more(limit=0)
        
        for comment in list(submission.comments)[:max_comments_per_post]:
            comment_data = {
                'id': comment.id,
                'body': comment.body,
                'score': comment.score,
                'created_utc': comment.created_utc,
                'author': str(comment.author) if comment.author else '[deleted]',
                'replies': []
            }
            
            if hasattr(comment, 'replies') and comment.replies:
                for reply in list(comment.replies)[:6]:
                    reply_data = {
                        'id': reply.id,
                        'body': reply.body,
                        'score': reply.score,
                        'created_utc': reply.created_utc,
                        'author': str(reply.author) if reply.author else '[deleted]',
                        'replies': []
                    }
                    comment_data['replies'].append(reply_data)
            
            submission_data['comments'].append(comment_data)
        
        new_posts_from_api.append(submission_data)
        
        if len(new_posts_from_api) >= num_posts:
            break
    
    return new_posts_from_api

def save_posts_to_database(subreddit, new_posts_from_api):
    """
    Saves Reddit posts to the database with a new search ID.
    
    Args:
        subreddit (str): The subreddit name these posts belong to
        new_posts_from_api (list): List of Reddit posts to save
        
    Returns:
        str: The generated search ID used to save the posts
    """
    cache_search_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        repo = RedditRepository(db)
        repo.save_search(
            search_id=cache_search_id,
            subreddit=subreddit,
            query=None,
            parameters={'type': 'cache', 'timestamp': datetime.utcnow().isoformat()}
        )
        
        if new_posts_from_api:
            print(f"[topic_model.py] Saving {len(new_posts_from_api)} posts to database with search ID: {cache_search_id}")
            for post in new_posts_from_api:
                if 'comments' in post and post['comments']:
                    _ensure_comment_ids(post['comments'])
            
            repo.save_posts(cache_search_id, new_posts_from_api)
    finally:
        db.close()
    
    return

def _ensure_comment_ids(comments):
    """Recursively ensure all comments and replies have IDs."""
    for comment in comments:
        if 'id' not in comment:
            comment['id'] = f"c_{str(uuid.uuid4())}"
        
        if 'replies' in comment and comment['replies']:
            _ensure_comment_ids(comment['replies'])

def retrieve_posts_from_database(subreddit, log_dir):
    """
    Retrieves all posts for a subreddit from the database.
    
    Args:
        subreddit (str): The subreddit name to retrieve posts for
        log_dir (str): Directory to save logs
        
    Returns:
        tuple: (raw_reddit_data, existing_post_ids)
    """
    db = SessionLocal()
    try:
        repo = RedditRepository(db)
        # Get all searches for this subreddit
        searches = repo.get_searches_by_subreddit(subreddit)
        
        # Collect all post IDs from these searches
        existing_post_ids = set()
        raw_reddit_data = []
        
        for search in searches:
            posts = repo.get_posts_by_search_id(search.id)
            for post in posts:
                if post.id not in existing_post_ids:
                    existing_post_ids.add(post.id)
                    
                    # Convert post to dictionary format
                    post_data = {
                        'id': post.id,
                        'title': post.title,
                        'content': post.content,
                        'score': post.score,
                        'created_utc': post.created_utc,
                        'url': post.url,
                        'permalink': post.permalink,
                        'num_comments': post.num_comments,
                        'author': post.author,
                        'comments': []
                    }
                    
                    # Add comments - make sure they exist and are loaded
                    if hasattr(post, 'comments') and post.comments:
                        for comment in post.comments:
                            comment_data = {
                                'id': comment.id,
                                'body': comment.body,
                                'score': comment.score,
                                'created_utc': comment.created_utc,
                                'author': comment.author
                            }
                            post_data['comments'].append(comment_data)
                    
                    raw_reddit_data.append(post_data)
        
        # Log the number of posts and comments retrieved
        total_comments = sum(len(post.get('comments', [])) for post in raw_reddit_data)
        print(f"[reddit.py] Retrieved {len(raw_reddit_data)} posts with {total_comments} comments from database")
        
        with open(os.path.join(log_dir, '1_cached_data.log'), 'w', encoding='utf-8') as f:
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
            f.write(f"Found cached data for subreddit: {subreddit}\n")
            f.write(f"Total posts in database: {len(existing_post_ids)}\n")
            f.write(f"Total comments retrieved: {total_comments}\n")

    finally:
        db.close()
    
    return raw_reddit_data, existing_post_ids

def log_data_collection_complete(log_dir, subreddit, new_posts_from_api, raw_reddit_data):
    """
    Logs information about completed data collection.
    
    Args:
        log_dir (str): Directory to save logs
        subreddit (str): The subreddit name
        new_posts_from_api (list): List of newly fetched posts
        raw_reddit_data (list): List of all posts from database
    """
    with open(os.path.join(log_dir, '2_data_collection_complete.log'), 'w', encoding='utf-8') as f:
        f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        f.write(f"Completed data collection for subreddit: {subreddit}\n")
        f.write(f"Fresh posts fetched: {len(new_posts_from_api)}\n")
        f.write(f"Total posts in database: {len(raw_reddit_data)}\n")
        f.write(f"Posts that will be analyzed: {(raw_reddit_data)}\n\n")

def process_posts_for_analysis(raw_reddit_data, max_comments_per_post, min_content_length=100):
    """
    Processes posts to build document corpus for analysis.
    
    Args:
        raw_reddit_data (list): List of posts from database
        max_comments_per_post (int): Maximum number of comments to include per post
        min_content_length (int): Minimum combined length of title and comments to include post
        
    Returns:
        tuple: (documents, post_ids, scores, post_data)
    """
    documents, post_ids, scores = [], [], []
    post_data = []
    
    for submission_data in raw_reddit_data:
        # Extract data from submission
        title = submission_data.get('title', '')
        content = submission_data.get('content', '')  # Get the main post content
        comments = submission_data.get('comments', [])
        created_utc = submission_data.get('created_utc', 0)
        timestamp = datetime.fromtimestamp(created_utc).strftime('%Y-%m-%d %H:%M:%S') if created_utc else ''
        
        # Process comments
        comments_text = ""
        for comment in comments[:max_comments_per_post]:
            comments_text += comment.get('body', '') + "\n"
        
        # Build document with title, content, and comments
        full_text = f"{title} {content} {comments_text}".strip()
        
        # Filter out posts with insufficient content
        if len(full_text) < min_content_length:
            continue
            
        if title or content or comments_text:  # Include content in the check
            documents.append(full_text)
            post_ids.append(submission_data['id'])
            scores.append(submission_data.get('score', 0))
            
            post_data.append({
                'id': submission_data['id'],
                'title': title,
                'content': content,  
                'comments_count': len(comments),
                'score': submission_data.get('score', 0),
                'timestamp': timestamp,
                'created_utc': created_utc
            })
    
    return documents, post_ids, scores, post_data

def log_post_samples(log_dir, post_data, documents):
    """
    Logs sample post data and documents.
    
    Args:
        log_dir (str): Directory to save logs
        post_data (list): List of processed post data
        documents (list): List of document texts
    """
    # Sample of posts for logging
    with open(os.path.join(log_dir, '2_data_sample.log'), 'w', encoding='utf-8') as f:
        f.write("Sample of collected posts:\n")
        for i, post in enumerate(post_data[:5]):  # Only show first 5 as a sample
            f.write(f"\nPost {i+1}:\n")
            f.write(f"  ID: {post['id']}\n")
            f.write(f"  Title: {post['title']}\n")
            f.write(f"  Score: {post['score']}\n")
            f.write(f"  Comments count: {post['comments_count']}\n")
    
    # Save full documents data
    with open(os.path.join(log_dir, '2_1_full_documents.json'), 'w', encoding='utf-8') as f:
        json.dump({
            'documents_count': len(documents),
            'sample_documents': documents[:20]  # Only save a few samples to keep file size reasonable
        }, f, indent=2)

def extract_sentiment_evidence(topic_docs, topic_posts, post_ids, temp_dir, max_sample_docs=30):
    """
    Extracts positive and negative evidence points from a sample of topic documents.
    
    Args:
        topic_docs (list): List of document texts for this topic
        topic_posts (list): List of post data for this topic
        post_ids (list): List of post IDs for the documents
        temp_dir (str): Directory to save temp files
        max_sample_docs (int): Maximum number of documents to sample for evidence extraction
        
    Returns:
        dict: Dictionary containing positive and negative evidence points with post references
    """
    # Use temp_dir instead of trying to construct log_dir with undefined variables
    log_dir = temp_dir
    os.makedirs(log_dir, exist_ok=True)
    try:
        # Sample a reasonable number of documents to analyze for evidence
        # Use documents with the strongest sentiment signals
        sample_docs = []
        sample_post_refs = []
        
        # Create a mapping of post IDs to their original post data
        post_id_to_data = {}
        for post in topic_posts:
            post_id_to_data[post['id']] = post
        
        # Sample posts, prioritizing those with content
        for i, (doc, post_id) in enumerate(zip(topic_docs, post_ids)):
            if i >= max_sample_docs:
                break
            # Use the original post ID instead of a sequential number
            sample_docs.append(doc[:2000])
            sample_post_refs.append(f"Post {post_id}")
            
        if not sample_docs:
            return {"positive": [], "negative": []}
            
        # Format the documents for the prompt
        formatted_docs = ""
        total_chars = 0
        max_formatted_chars = 35000
        
        for i, (doc, post_ref) in enumerate(zip(sample_docs, sample_post_refs)):
            doc_formatted = f"{post_ref}:\n{doc.strip()}\n\n"
            # Check if adding this document would exceed the character limit
            if total_chars + len(doc_formatted) > max_formatted_chars:
                # Stop adding more documents if we would exceed the limit
                break
            formatted_docs += doc_formatted
            total_chars += len(doc_formatted)
            
        if not formatted_docs:
            return {"positive": [], "negative": []}
        
        # Generate the prompt using the prompt module
        analysis_prompt = get_sentiment_evidence_prompt(formatted_docs)
        
        # Log the prompt for debugging
        os.makedirs(log_dir, exist_ok=True)
        prompt_file_path = os.path.join(log_dir, f'sentiment_evidence_prompt_{hash(str(post_ids))}.txt')
        with open(prompt_file_path, 'w', encoding='utf-8') as f:
            f.write(analysis_prompt)
        
        print(f"[topic_model.py] Extracting sentiment evidence from {len(sample_docs)} documents")
        print(f"[topic_model.py] Generated prompt : {analysis_prompt}")
        
        # Call the OpenAI API with JSON parsing
        message = [{"role": "user", "content": analysis_prompt}]

        evidence_response = get_openai_completion(message, temperature=0.1)
        
        # Log the response for debugging
        response_file_path = os.path.join(log_dir, f'sentiment_evidence_response_{hash(str(post_ids))}.txt')
        with open(response_file_path, 'w', encoding='utf-8') as f:
            f.write(evidence_response)
            
        print(f"[topic_model.py] Extracted evidence: {evidence_response}")

        # Clean the response before parsing - handle markdown code blocks and line breaks
        evidence_text = evidence_response.strip()
        
        # Check if the response is wrapped in markdown code blocks and extract just the JSON part
        if evidence_text.startswith("```json") and "```" in evidence_text[7:]:
            # Extract the content between the markdown tags
            json_start = evidence_text.find("```json") + 7
            json_end = evidence_text.find("```", json_start)
            evidence_text = evidence_text[json_start:json_end].strip()
        elif evidence_text.startswith("```") and evidence_text.endswith("```"):
            # Handle generic code blocks
            evidence_text = evidence_text[3:-3].strip()
            
        # Parse the cleaned JSON response
        try:
            evidence = json.loads(evidence_text)
        except json.JSONDecodeError as e:
            print(f"[topic_model.py] Error parsing JSON response: {e}")
            print(f"[topic_model.py] Problematic JSON text: {evidence_text[:100]}...")
            evidence = {"positive": [], "negative": []}
            
        # Ensure the result has the expected structure
        if not isinstance(evidence, dict):
            evidence = {"positive": [], "negative": []}
        if "positive" not in evidence:
            evidence["positive"] = []
        if "negative" not in evidence:
            evidence["negative"] = []
            
        # Clean up resources
        del sample_docs
        del sample_post_refs
        del post_id_to_data
        del formatted_docs
        del analysis_prompt
        del message
        del evidence_response
        del evidence_text
        
        # Force garbage collection
        gc.collect()
            
        return evidence
        
    except Exception as e:
        print(f"[topic_model.py] Error extracting sentiment evidence: {str(e)}")
        import traceback
        print(traceback.format_exc())
        
        # Clean up any resources that might have been allocated in case of error
        for var_name in ['sample_docs', 'sample_post_refs', 'post_id_to_data', 
                         'formatted_docs', 'analysis_prompt', 'message', 
                         'evidence_response', 'evidence_text']:
            if var_name in locals():
                del locals()[var_name]
        
        # Force garbage collection
        gc.collect()
        
        return {"positive": [], "negative": []}

def process_top_topics(topic_model, topic_info, topics, documents, post_ids, post_data, topic_summaries,
                      response, log_dir, topics_limit, job_id=None):
    # Create a safe string for logging and ensure topics_limit is an integer if provided
    if topics_limit is not None and isinstance(topics_limit, int):
        limit_str = str(topics_limit)
    else:
        topics_limit = None
        limit_str = "all"
        
    print(f"[topic_model.py] Processing {limit_str} topics", topic_info)
    sentiment_results = []
    topic_engagement_metrics = {}
    
    if topics_limit is not None and isinstance(topics_limit, int):
        top_topics = topic_info[topic_info['Topic'] != -1].nlargest(topics_limit, 'Count')
    else:
        top_topics = topic_info[topic_info['Topic'] != -1]
    
    temp_dir = os.path.join(os.getenv('TOPIC_LOG_DIR', 'log_topic'), 'topic_sentiment')
    os.makedirs(temp_dir, exist_ok=True)
    
    # Delete all files in temp_dir if it exists
    if os.path.exists(temp_dir):
        for file in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, file)
            if os.path.isfile(file_path):
                os.remove(file_path)
    
    for topic in top_topics.itertuples():
        topic_id = int(topic.Topic)
        topic_posts_ids = [post_id for post_id, t in zip(post_ids, topics) if t == topic_id]
        topic_posts = [post for post in post_data if post['id'] in topic_posts_ids]
        
        # Calculate topic-specific engagement metrics
        topic_total_comments = sum(post.get('comments_count', 0) for post in topic_posts)
        topic_total_score = sum(post.get('score', 0) for post in topic_posts)
        topic_post_count = len(topic_posts)
        
        topic_engagement_metrics[topic_id] = {
            'post_count': topic_post_count,
            'total_comments': topic_total_comments,
            'total_score': topic_total_score,
            'avg_comments_per_post': topic_total_comments / topic_post_count if topic_post_count > 0 else 0,
            'avg_score_per_post': topic_total_score / topic_post_count if topic_post_count > 0 else 0
        }
        
        topic_docs = [doc for doc, t in zip(documents, topics) if t == topic_id]
        
        # Log the documents for this topic
        with open(os.path.join(log_dir, f'7_1_topic_{topic_id}_documents.txt'), 'w', encoding='utf-8') as f:
            f.write(f"Documents for Topic {topic_id} (showing first 3):\n\n")
            for i, doc in enumerate(topic_docs[:3]):
                f.write(f"Document {i+1}:\n{doc[:500]}...\n\n")
                    
        sentiment_category, sentiment_score = analyze_topic_sentiment(topic_docs, topic_id, temp_dir)
        
        sentiment_results.append({
            "topic_id": topic_id,
            "sentiment_category": sentiment_category,  
            "sentiment_score": float(sentiment_score)
        })
        
        # Analyze sentiment for each post in this topic
        post_sentiments = {}
        for i, (doc, post_id) in enumerate([(doc, pid) for doc, pid, t in zip(documents, post_ids, topics) if t == topic_id]):
            # Use the same sentiment analyzer for individual posts
            post_sentiment_category, post_sentiment_score = analyze_post_sentiment(doc, temp_dir)
            post_sentiments[post_id] = {
                "sentiment_category": post_sentiment_category,
                "sentiment_score": float(post_sentiment_score)
            }
        
        # Log post-level sentiments
        with open(os.path.join(log_dir, f'8_1_topic_{topic_id}_post_sentiments.json'), 'w', encoding='utf-8') as f:
            json.dump(post_sentiments, f, indent=2)
        
        # NEW: Extract sentiment evidence points from topic documents
        if job_id:
            update_job_status(job_id, 'processing', f'Extracting evidence points for topic {topic_id}', progress=75)
        sentiment_evidence = extract_sentiment_evidence(
            topic_docs, 
            topic_posts, 
            topic_posts_ids, 
            temp_dir
        )
        
        # Log sentiment evidence
        with open(os.path.join(log_dir, f'8_2_topic_{topic_id}_sentiment_evidence.json'), 'w', encoding='utf-8') as f:
            json.dump(sentiment_evidence, f, indent=2)
        
        filtered_terms = [
            {'term': str(term), 'weight': float(weight)}
            for term, weight in topic_model.get_topic(topic_id)
            if str(term).lower() not in ['like', 'just', 'know', 'don', 'get', 'really', 'think']
        ]

        # Use the filtered terms if there are enough, otherwise use original
        topic_data = {
            'id': topic_id,
            'count': int(topic.Count),
            'score': float(sentiment_score),
            'engagement': topic_engagement_metrics[topic_id],
            'terms': filtered_terms if len(filtered_terms) >= 5 else [
                {'term': str(term), 'weight': float(weight)}
                for term, weight in topic_model.get_topic(topic_id)
            ],
            'post_ids': topic_posts_ids,
            'post_sentiments': post_sentiments,
            'sentiment_evidence': sentiment_evidence
        }
        
        # Handle the new summary format (could be string or dict)
        summary = topic_summaries.get(topic_id, {})
        if isinstance(summary, dict):
            topic_data['summary'] = summary.get('long_summary', "No summary available")
            topic_data['short_summary'] = summary.get('short_summary', "")
            topic_data['one_sentence_summary'] = summary.get('one_sentence_summary', "")
        elif isinstance(summary, str):
            # Check if the summary is a JSON string wrapped in markdown code block
            if "```json" in summary:
                try:
                    # Extract the JSON part from the markdown code block
                    json_part = summary.split("```json")[1].split("```")[0].strip()
                    summary_dict = json.loads(json_part)
                    topic_data['summary'] = summary_dict.get('long_summary', "No summary available")
                    topic_data['short_summary'] = summary_dict.get('short_summary', "")
                    topic_data['one_sentence_summary'] = summary_dict.get('one_sentence_summary', "")
                except (json.JSONDecodeError, IndexError, KeyError) as e:
                    print(f"[reddit.py] Error parsing JSON summary: {str(e)}")
                    topic_data['summary'] = summary
                    topic_data['short_summary'] = ""
                    topic_data['one_sentence_summary'] = ""
            else:
                # Try to parse as plain JSON string
                try:
                    summary_dict = json.loads(summary)
                    topic_data['summary'] = summary_dict.get('long_summary', "No summary available")
                    topic_data['short_summary'] = summary_dict.get('short_summary', "")
                    topic_data['one_sentence_summary'] = summary_dict.get('one_sentence_summary', "")
                except json.JSONDecodeError:
                    # If not valid JSON, use as-is
                    topic_data['summary'] = summary
                    topic_data['short_summary'] = ""
                    topic_data['one_sentence_summary'] = ""
        else:
            topic_data['summary'] = "No summary available"
            topic_data['short_summary'] = ""
            topic_data['one_sentence_summary'] = ""

        # Add to appropriate sentiment category
        if sentiment_score > 0.15:
            response['topics']['positive']['topics'].append(topic_data)
            response['topics']['positive']['count'] += 1
        elif sentiment_score < -0.20:
            response['topics']['negative']['topics'].append(topic_data)
            response['topics']['negative']['count'] += 1
        else:
            response['topics']['neutral']['topics'].append(topic_data)
            response['topics']['neutral']['count'] += 1
            
        # Clear memory for this topic iteration
        del topic_posts
        del topic_docs
        del sentiment_evidence
        del post_sentiments
        gc.collect()
    
    # Clean up the temp directory
    if os.path.exists(temp_dir):
        for file in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, file)
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Failed to remove file {file_path}: {e}")
    
    return sentiment_results, topic_engagement_metrics

def index_data_in_pgvector(subreddit, raw_reddit_data, log_dir):
    """
    Indexes Reddit data in PGVector database.
    
    Args:
        subreddit (str): The subreddit name
        raw_reddit_data (list): List of Reddit posts to index
        log_dir (str): Directory to save logs
        
    Returns:
        dict: Result of the indexing operation
    """
    try:
        # Import the PGVector functions
        from util.llm_models.pgvector.pgvector import store_reddit_data_in_pgvector, create_pgvector_tables
        
        # Ensure PGVector tables exist
        create_pgvector_tables()
        
        # Log before storing data
        with open(os.path.join(log_dir, '10_pgvector_pre_indexing.log'), 'w', encoding='utf-8') as f:
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
            f.write(f"Attempting to index {len(raw_reddit_data)} documents in PGVector\n")
            f.write(f"Sample post: {json.dumps(raw_reddit_data[0] if raw_reddit_data else {}, indent=2)[:500]}...\n")
        
        # Store data in PGVector with the appropriate embedding type
        num_indexed = store_reddit_data_in_pgvector(
            subreddit,
            raw_reddit_data,
        )
        
        result = {
            'success': True,
            'indexed_documents': num_indexed
        }
        
        # Log PGVector indexing results
        with open(os.path.join(log_dir, '10_pgvector_indexing.log'), 'w', encoding='utf-8') as f:
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
            collection_name = subreddit
            f.write(f"Indexed {num_indexed} documents in PGVector collection '{collection_name}'\n")
        
        # Clean up imported modules
        import sys
        if 'util.llm_models.pgvector.pgvector' in sys.modules:
            del sys.modules['util.llm_models.pgvector.pgvector']
        
        # Force garbage collection
        gc.collect()
        
        return result
        
    except Exception as e:
        error_message = str(e)
        
        # Log PGVector indexing error with more detailed information
        with open(os.path.join(log_dir, '10_pgvector_indexing_error.log'), 'w', encoding='utf-8') as f:
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
            f.write(f"Error indexing in PGVector: {error_message}\n")
            import traceback
            f.write(f"\nTraceback:\n{traceback.format_exc()}")
            
            # Log environment and configuration information
            f.write("\n\nEnvironment Information:\n")
            import sys
            f.write(f"Python version: {sys.version}\n")
            
            # Log database connection information (safely)
            from app.db.config.database import DATABASE_URL
            # Mask password if present
            safe_db_url = DATABASE_URL
            if "://" in safe_db_url and "@" in safe_db_url:
                parts = safe_db_url.split("://", 1)
                auth_parts = parts[1].split("@", 1)
                user_pass = auth_parts[0].split(":", 1)
                if len(user_pass) > 1:
                    safe_db_url = f"{parts[0]}://{user_pass[0]}:****@{auth_parts[1]}"
            
            f.write(f"Database URL: {safe_db_url}\n")
        
        # Clean up imported modules
        import sys
        if 'util.llm_models.pgvector.pgvector' in sys.modules:
            del sys.modules['util.llm_models.pgvector.pgvector']
        
        # Force garbage collection
        gc.collect()
        
        return {
            'success': False,
            'error': error_message
        }

def analyze_post_sentiment(doc, temp_dir):
    """
    Analyze sentiment of a single post/document
    
    Args:
        doc (str): The document text to analyze
        temp_dir (str): Directory to save debug information
        
    Returns:
        tuple: (sentiment_category, sentiment_score)
    """
    try:
        # Import the sentiment analyzer function
        from util.topic_model.BertTopic import analyze_topic_sentiment
        
        # Use the existing function but with a list containing just this document
        sentiment_result = analyze_topic_sentiment([doc], "post_level", temp_dir)
        
        # Clean up imported modules
        import sys
        if 'util.topic_model.BertTopic' in sys.modules:
            del sys.modules['util.topic_model.BertTopic']
        
        # Force garbage collection
        gc.collect()
        
        return sentiment_result
    except Exception as e:
        print(f"[topic_model.py] Error analyzing post sentiment: {str(e)}")
        # Force garbage collection
        gc.collect()
        return "neutral", 0.0

@topic_model_bp.route('/job-status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get the status of a topic modeling job by its ID"""
    try:
        # Get the job from the database
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            job = jobs_repo.get_job_by_id(job_id)
            
            if job:
                # Convert SQLAlchemy object to dictionary
                response = {
                    'job_id': job.id,
                    'status': job.status,
                    'message': job.message,
                    'created_at': job.created_at.isoformat(),
                    'updated_at': job.updated_at.isoformat()
                }
                
                # Include optional fields if they exist
                if job.progress is not None:
                    response['progress'] = job.progress
                
                if job.error:
                    response['error'] = job.error
                
                if job.analysis_id:
                    response['analysis_id'] = job.analysis_id
                    
                    # If status is completed, get the full analysis result
                    if job.status == 'completed':
                        # Fetch the analysis from the database
                        reddit_repo = RedditRepository(db)
                        analysis = reddit_repo.get_analysis_by_id(job.analysis_id)
                        if analysis:
                            response['result'] = analysis.data
                            # Explicitly dispose of analysis object
                            del analysis
                
                return jsonify(response)
            
            return jsonify({'error': 'Job not found'}), 404
        finally:
            db.close()
            # Clean up resources
            del jobs_repo
            if 'reddit_repo' in locals():
                del reddit_repo
            if 'job' in locals():
                del job
            if 'response' in locals():
                del response
            gc.collect()
            
    except Exception as e:
        error_msg = f"Error retrieving job status: {str(e)}"
        print(error_msg)
        # Force garbage collection to clean up any resources
        gc.collect()
        return jsonify({'error': error_msg}), 500

@topic_model_bp.route('/job/<job_id>', methods=['DELETE'])
def cancel_job(job_id):
    """Cancel a topic modeling job if it's still pending"""
    try:
        # Cancel the job in the database
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            cancelled = jobs_repo.cancel_job(job_id)
            
            if cancelled:
                return jsonify({
                    'job_id': job_id,
                    'status': 'cancelled',
                    'message': 'Job was cancelled by user request'
                })
            else:
                # Get the job to check its status
                job = jobs_repo.get_job_by_id(job_id)
                if not job:
                    return jsonify({'error': 'Job not found'}), 404
                    
                return jsonify({
                    'error': f"Cannot cancel job with status '{job.status}'"
                }), 400
        finally:
            db.close()
            # Clean up resources
            del jobs_repo
            if 'job' in locals():
                del job
            if 'cancelled' in locals():
                del cancelled
            gc.collect()
                
    except Exception as e:
        error_msg = f"Error cancelling job: {str(e)}"
        print(error_msg)
        # Force garbage collection
        gc.collect()
        return jsonify({'error': error_msg}), 500

@topic_model_bp.route('/jobs/user/<user_id>', methods=['GET'])
def get_jobs_by_user(user_id):
    """Get all jobs for a user"""
    try:
        limit = request.args.get('limit', default=20, type=int)
        
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            jobs = jobs_repo.get_jobs_by_user_id(user_id, limit=limit)
            
            # Convert to JSON serializable format
            jobs_list = []
            for job in jobs:
                job_dict = {
                    'job_id': job.id,
                    'status': job.status,
                    'message': job.message,
                    'created_at': job.created_at.isoformat(),
                    'updated_at': job.updated_at.isoformat(),
                    'parameters': job.parameters,
                }
                
                if job.progress is not None:
                    job_dict['progress'] = job.progress
                
                if job.error:
                    job_dict['error'] = job.error
                
                if job.analysis_id:
                    job_dict['analysis_id'] = job.analysis_id
                
                jobs_list.append(job_dict)
            
            response = jsonify(jobs_list)
            # Explicitly dispose of jobs
            del jobs
            del jobs_list
            return response
        finally:
            db.close()
            # Clean up resources
            del jobs_repo
            gc.collect()
            
    except Exception as e:
        error_msg = f"Error retrieving jobs: {str(e)}"
        print(error_msg)
        # Force garbage collection
        gc.collect()
        return jsonify({'error': error_msg}), 500

@topic_model_bp.route('/jobs/analysis/<analysis_id>', methods=['GET'])
def get_jobs_by_analysis(analysis_id):
    """Get all jobs associated with an analysis"""
    try:
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            jobs = jobs_repo.get_jobs_by_analysis_id(analysis_id)
            
            # Convert to JSON serializable format
            jobs_list = []
            for job in jobs:
                job_dict = {
                    'job_id': job.id,
                    'user_id': job.user_id,
                    'status': job.status,
                    'message': job.message,
                    'created_at': job.created_at.isoformat(),
                    'updated_at': job.updated_at.isoformat()
                }
                
                if job.progress is not None:
                    job_dict['progress'] = job.progress
                
                if job.error:
                    job_dict['error'] = job.error
                
                jobs_list.append(job_dict)
            
            response = jsonify(jobs_list)
            # Explicitly dispose of jobs
            del jobs
            del jobs_list
            return response
        finally:
            db.close()
            # Clean up resources
            del jobs_repo
            gc.collect()
            
    except Exception as e:
        error_msg = f"Error retrieving jobs: {str(e)}"
        print(error_msg)
        # Force garbage collection
        gc.collect()
        return jsonify({'error': error_msg}), 500

def fetch_reddit_posts_with_keyword(subreddit, keyword, num_posts, max_comments_per_post, log_dir, sort='relevance'):
    """
    Fetches posts from a specified subreddit using the Reddit API, filtered by a keyword.
    
    Args:
        subreddit (str): The subreddit name to fetch posts from
        keyword (str): Keyword to search for in posts
        num_posts (int): Maximum number of posts to fetch
        max_comments_per_post (int): Maximum number of comments to fetch per post
        log_dir (str): Directory to save logs
        sort (str): Sorting method for posts ('relevance', 'new', 'hot')
        
    Returns:
        list: List of collected Reddit posts with their comments
    """
    # Log step 1: Data collection start
    with open(os.path.join(log_dir, '1_data_collection_start.log'), 'w', encoding='utf-8') as f:
        f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        f.write(f"Starting data collection for subreddit: {subreddit}\n")
        f.write(f"Keyword search: {keyword}\n")
        f.write(f"Target post count: {num_posts}\n")
        f.write(f"Max comments per post: {max_comments_per_post}\n")
    
    # STEP 1: Fetch fresh data from Reddit API first
    print(f"[topic_model.py] reddit instance inited, fetching posts with keyword '{keyword}'")
    
    # Get posts from Reddit with the keyword search
    new_posts_from_api = []
    
    try:
        # Use the Reddit search function with the keyword
        search_results = reddit.subreddit(subreddit).search(
            keyword, 
            sort=sort, 
            limit=min(800, num_posts * 2)
        )
        
        for submission in search_results:
            title = submission.title
            content = submission.selftext if hasattr(submission, 'selftext') else ''
            
            created_utc = submission.created_utc
            timestamp = datetime.fromtimestamp(created_utc).strftime('%Y-%m-%d %H:%M:%S')
            
            submission_data = {
                'id': submission.id,
                'title': title,
                'content': content,
                'score': submission.score,
                'created_utc': created_utc,
                'url': submission.url,
                'permalink': submission.permalink,
                'num_comments': submission.num_comments,
                'author': str(submission.author) if submission.author else '[deleted]',
                'comments': []
            }
            
            submission.comments.replace_more(limit=0)
            
            for comment in list(submission.comments)[:max_comments_per_post]:
                comment_data = {
                    'id': comment.id,
                    'body': comment.body,
                    'score': comment.score,
                    'created_utc': comment.created_utc,
                    'author': str(comment.author) if comment.author else '[deleted]',
                    'replies': []
                }
                
                if hasattr(comment, 'replies') and comment.replies:
                    for reply in list(comment.replies)[:6]:
                        reply_data = {
                            'id': reply.id,
                            'body': reply.body,
                            'score': reply.score,
                            'created_utc': reply.created_utc,
                            'author': str(reply.author) if reply.author else '[deleted]',
                            'replies': []
                        }
                        comment_data['replies'].append(reply_data)
                
                submission_data['comments'].append(comment_data)
            
            new_posts_from_api.append(submission_data)
            
            if len(new_posts_from_api) >= num_posts:
                break
                
        print(f"[topic_model.py] Found {len(new_posts_from_api)} posts containing keyword '{keyword}'")
        
    except Exception as e:
        print(f"[topic_model.py] Error in Reddit keyword search: {str(e)}")
        
        # If we fail with the keyword search, log the error but return an empty list
        # to avoid completely failing the analysis
        with open(os.path.join(log_dir, '1_keyword_search_error.log'), 'w', encoding='utf-8') as f:
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
            f.write(f"Error in keyword search: {str(e)}\n")
            f.write(f"Subreddit: {subreddit}, Keyword: {keyword}\n")
            import traceback
            f.write(f"\nTraceback:\n{traceback.format_exc()}")
    
    return new_posts_from_api