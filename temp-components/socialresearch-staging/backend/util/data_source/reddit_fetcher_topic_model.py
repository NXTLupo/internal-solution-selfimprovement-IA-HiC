import praw
import os
from datetime import datetime
from dotenv import load_dotenv
from threading import Event

# Load environment variables
load_dotenv()

def get_reddit_client():
    """
    Initialize and return a Reddit API client.
    
    Returns:
        praw.Reddit: Configured Reddit client instance
    """
    return praw.Reddit(
        client_id=os.getenv('REDDIT_CLIENT_ID'),
        client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
        user_agent=os.getenv('REDDIT_USER_AGENT'),
    )

def fetch_reddit_posts(subreddit, num_posts, max_comments_per_post, log_dir, sort='relevance', startDate=None, endDate=None, cancel_event=None, process_images=True):
    """
    Fetches posts from a specified subreddit using the Reddit API.
    
    Args:
        subreddit (str): The subreddit name to fetch posts from
        num_posts (int): Maximum number of posts to fetch
        max_comments_per_post (int): Maximum number of comments to fetch per post
        log_dir (str): Directory to save logs
        sort (str): Sorting method for posts ('relevance', 'new', 'hot')
        startDate (str): Optional start date in format "YYYY-MM-DD"
        endDate (str): Optional end date in format "YYYY-MM-DD"
        cancel_event (Event): Event to check for cancellation
        process_images (bool): Whether to process image URLs with GPT-4o
        
    Returns:
        list: List of collected Reddit posts with their comments
    """
    # Initialize Reddit client
    reddit = get_reddit_client()
    
    # Convert date strings to Unix timestamps if provided
    start_timestamp = None
    end_timestamp = None
    
    if startDate:
        try:
            # Convert YYYY-MM-DD to Unix timestamp (seconds since epoch)
            start_date_obj = datetime.strptime(startDate, "%Y-%m-%d")
            start_timestamp = start_date_obj.timestamp()
            print(f"[reddit_fetcher.py] Filtering posts after {startDate} (timestamp: {start_timestamp})")
        except ValueError as e:
            print(f"[reddit_fetcher.py] Invalid start date format: {e}")
    
    if endDate:
        try:
            # Convert YYYY-MM-DD to Unix timestamp (seconds since epoch)
            # Set time to end of day (23:59:59)
            end_date_obj = datetime.strptime(endDate, "%Y-%m-%d")
            end_date_obj = end_date_obj.replace(hour=23, minute=59, second=59)
            end_timestamp = end_date_obj.timestamp()
            print(f"[reddit_fetcher.py] Filtering posts before {endDate} (timestamp: {end_timestamp})")
        except ValueError as e:
            print(f"[reddit_fetcher.py] Invalid end date format: {e}")
    
    # Log step 1: Data collection start
    with open(os.path.join(log_dir, '1_data_collection_start.log'), 'w', encoding='utf-8') as f:
        f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        f.write(f"Starting data collection for subreddit: {subreddit}\n")
        f.write(f"Target post count: {num_posts}\n")
        f.write(f"Max comments per post: {max_comments_per_post}\n")
        f.write(f"Image processing enabled: {process_images}\n")
        if startDate or endDate:
            f.write(f"Date range filter: {startDate or 'none'} to {endDate or 'none'}\n")
    
    # STEP 1: Fetch fresh data from Reddit API first
    print("[reddit_fetcher.py] reddit instance inited, fetching fresh posts")
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
        # Check for cancellation during data fetching
        if cancel_event and cancel_event.is_set():
            print(f"[reddit_fetcher.py] Data fetching cancelled")
            break
        
        # Skip posts from AutoModerator
        if submission.author and str(submission.author).lower() == 'automoderator':
            continue
            
        title = submission.title
        content = submission.selftext if hasattr(submission, 'selftext') else ''
        
        created_utc = submission.created_utc
        
        # Apply date filtering if timestamps are provided
        if start_timestamp and created_utc < start_timestamp:
            continue
        if end_timestamp and created_utc > end_timestamp:
            continue
            
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
            # Skip comments from AutoModerator
            if comment.author and str(comment.author).lower() == 'automoderator':
                continue
                
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
                    # Skip replies from AutoModerator
                    if reply.author and str(reply.author).lower() == 'automoderator':
                        continue
                        
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
    
    # STEP 2: Process image URLs if enabled
    if process_images and new_posts_from_api:       
        # Check for cancellation before image processing
        if cancel_event and cancel_event.is_set():
            return new_posts_from_api
            
        try:
            from util.image_processing.batch_processor import RedditImageBatchProcessor
            
            processor = RedditImageBatchProcessor()
            processed_posts = processor.process_posts_batch(new_posts_from_api, cancel_event)
            
            print(f"[reddit_fetcher.py] Image processing complete")
            return processed_posts
            
        except Exception as e:
            print(f"[reddit_fetcher.py] Error during image processing: {str(e)}")
            # Return original posts if image processing fails
            return new_posts_from_api
    
    return new_posts_from_api

def fetch_reddit_posts_with_keyword(subreddit, keyword, num_posts, max_comments_per_post, log_dir, sort='relevance', startDate=None, endDate=None, cancel_event=None, process_images=True):
    """
    Fetches posts from a specified subreddit using the Reddit API, filtered by a keyword.
    
    Args:
        subreddit (str): The subreddit name to fetch posts from
        keyword (str): Keyword to search for in posts
        num_posts (int): Maximum number of posts to fetch
        max_comments_per_post (int): Maximum number of comments to fetch per post
        log_dir (str): Directory to save logs
        sort (str): Sorting method for posts ('relevance', 'new', 'hot')
        startDate (str): Optional start date in format "YYYY-MM-DD"
        endDate (str): Optional end date in format "YYYY-MM-DD"
        cancel_event (Event): Event to check for cancellation
        process_images (bool): Whether to process image URLs with GPT-4o
        
    Returns:
        list: List of collected Reddit posts with their comments
    """
    # Initialize Reddit client
    reddit = get_reddit_client()
    
    # Convert date strings to Unix timestamps if provided
    start_timestamp = None
    end_timestamp = None
    
    if startDate:
        try:
            # Convert YYYY-MM-DD to Unix timestamp (seconds since epoch)
            start_date_obj = datetime.strptime(startDate, "%Y-%m-%d")
            start_timestamp = start_date_obj.timestamp()
            print(f"[reddit_fetcher.py] Filtering keyword posts after {startDate} (timestamp: {start_timestamp})")
        except ValueError as e:
            print(f"[reddit_fetcher.py] Invalid start date format: {e}")
    
    if endDate:
        try:
            # Convert YYYY-MM-DD to Unix timestamp (seconds since epoch)
            # Set time to end of day (23:59:59)
            end_date_obj = datetime.strptime(endDate, "%Y-%m-%d")
            end_date_obj = end_date_obj.replace(hour=23, minute=59, second=59)
            end_timestamp = end_date_obj.timestamp()
            print(f"[reddit_fetcher.py] Filtering keyword posts before {endDate} (timestamp: {end_timestamp})")
        except ValueError as e:
            print(f"[reddit_fetcher.py] Invalid end date format: {e}")
    
    # Log step 1: Data collection start
    with open(os.path.join(log_dir, '1_data_collection_start.log'), 'w', encoding='utf-8') as f:
        f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        f.write(f"Starting data collection for subreddit: {subreddit}\n")
        f.write(f"Keyword search: {keyword}\n")
        f.write(f"Target post count: {num_posts}\n")
        f.write(f"Max comments per post: {max_comments_per_post}\n")
        f.write(f"Image processing enabled: {process_images}\n")
        if startDate or endDate:
            f.write(f"Date range filter: {startDate or 'none'} to {endDate or 'none'}\n")
    
    # STEP 1: Fetch fresh data from Reddit API first
    print(f"[reddit_fetcher.py] reddit instance inited, fetching posts with keyword '{keyword}'")
    
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
            # Check for cancellation during data fetching
            if cancel_event and cancel_event.is_set():
                print(f"[reddit_fetcher.py] Data fetching cancelled")
                break
            
            # Skip posts from AutoModerator
            if submission.author and str(submission.author).lower() == 'automoderator':
                continue
            
            title = submission.title
            content = submission.selftext if hasattr(submission, 'selftext') else ''
            
            created_utc = submission.created_utc
            
            # Apply date filtering if timestamps are provided
            if start_timestamp and created_utc < start_timestamp:
                continue
            if end_timestamp and created_utc > end_timestamp:
                continue
                
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
                # Skip comments from AutoModerator
                if comment.author and str(comment.author).lower() == 'automoderator':
                    continue
                    
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
                        # Skip replies from AutoModerator
                        if reply.author and str(reply.author).lower() == 'automoderator':
                            continue
                            
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
                
        print(f"[reddit_fetcher.py] Found {len(new_posts_from_api)} posts containing keyword '{keyword}'")
        
        # STEP 2: Process image URLs if enabled
        if process_images and new_posts_from_api:
            print(f"[reddit_fetcher.py] Processing image URLs in {len(new_posts_from_api)} keyword posts")
            
            # Check for cancellation before image processing
            if cancel_event and cancel_event.is_set():
                print(f"[reddit_fetcher.py] Image processing cancelled")
                return new_posts_from_api
                
            try:
                from util.image_processing.batch_processor import RedditImageBatchProcessor
                
                processor = RedditImageBatchProcessor()
                processed_posts = processor.process_posts_batch(new_posts_from_api, cancel_event)
                
                print(f"[reddit_fetcher.py] Image processing complete")
                return processed_posts
                
            except Exception as e:
                print(f"[reddit_fetcher.py] Error during image processing: {str(e)}")
                # Return original posts if image processing fails
                return new_posts_from_api
        
        return new_posts_from_api
        
    except Exception as e:
        print(f"[reddit_fetcher.py] Error during keyword search: {str(e)}")
        return [] 