import praw
import os
import re
import time
from datetime import datetime
from dotenv import load_dotenv
from threading import Event

# Load environment variables
load_dotenv()

def normalize_subreddit(name):
    """Reduce user input to the bare subreddit name: 'r/neu', '/r/neu/' and
    'https://www.reddit.com/r/neu/' all become 'neu'. PRAW 404s on the prefixed forms."""
    value = (name or '').strip()
    match = re.search(r'(?:^|/)r/([A-Za-z0-9_]+)', value, re.IGNORECASE)
    if match:
        return match.group(1)
    return value.strip('/ ')

def keyword_regex(keyword):
    """Whole-word, case-insensitive matcher ('AI' matches 'ai', never 'said' or 'email').
    Same rule as the post browser's keyword filter (SubredditDetail/keywordMatch.tsx)."""
    return re.compile(r'(?<![A-Za-z0-9])' + re.escape(keyword.strip()) + r'(?![A-Za-z0-9])', re.IGNORECASE)

def post_mentions_keyword(post, pattern):
    """True when a post dict's title, body or any comment (nested replies included) matches."""
    if pattern.search(post.get('title') or '') or pattern.search(post.get('content') or ''):
        return True
    stack = list(post.get('comments') or [])
    while stack:
        comment = stack.pop()
        if pattern.search(comment.get('body') or ''):
            return True
        stack.extend(comment.get('replies') or [])
    return False

def describe_reddit_error(error, subreddit):
    """Turn a PRAW/HTTP error into a message the user can act on."""
    text = str(error)
    if '404' in text:
        return f"r/{subreddit} was not found on Reddit (HTTP 404). Check the subreddit name."
    if '403' in text:
        return f"r/{subreddit} is private, quarantined or banned (HTTP 403)."
    if '401' in text:
        return "Reddit rejected the API credentials (HTTP 401). Check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET."
    if '429' in text:
        return "Reddit rate-limited the request (HTTP 429). Wait a minute and run the analysis again."
    return f"Reddit request for r/{subreddit} failed: {text}"

def _search_time_filter(start_timestamp):
    """Smallest Reddit search window that still covers the requested start date, so the
    ~250-result search cap is spent on posts inside the date range instead of older ones."""
    if not start_timestamp:
        return 'all'
    age_days = (time.time() - start_timestamp) / 86400
    for max_days, name in ((1, 'day'), (7, 'week'), (31, 'month'), (365, 'year')):
        if age_days <= max_days:
            return name
    return 'all'

def _iterate_listing(listing, subreddit):
    """Iterate a lazy PRAW listing, re-raising HTTP failures with an actionable message."""
    try:
        for item in listing:
            yield item
    except Exception as e:
        raise RuntimeError(describe_reddit_error(e, subreddit)) from e

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
    subreddit = normalize_subreddit(subreddit)

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

    for submission in _iterate_listing(raw_data, subreddit):
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
        sort (str): Ignored for keyword search (always relevance, then newest first in the date range)
        startDate (str): Optional start date in format "YYYY-MM-DD"
        endDate (str): Optional end date in format "YYYY-MM-DD"
        cancel_event (Event): Event to check for cancellation
        process_images (bool): Whether to process image URLs with GPT-4o
        
    Returns:
        list: List of collected Reddit posts with their comments
    """
    # Initialize Reddit client
    reddit = get_reddit_client()
    subreddit = normalize_subreddit(subreddit)

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
        # Keyword retrieval is always Reddit's relevance search, which returns the most matches
        # (r/neu 'AI', Sep 1-Nov 9 2026: relevance 24 in-range posts, hot 15). Results are limited
        # to the user's date range and ordered newest first. The `sort` argument only applies to
        # the no-keyword listing path.
        time_filter = _search_time_filter(start_timestamp)
        print(f"[reddit_fetcher.py] Searching r/{subreddit} for '{keyword}' (sort=relevance, time_filter={time_filter}), keeping {startDate or 'any'}..{endDate or 'any'} newest first")
        search_results = reddit.subreddit(subreddit).search(
            keyword,
            sort='relevance',
            time_filter=time_filter,
            limit=1000
        )

        matched = []
        for submission in _iterate_listing(search_results, subreddit):
            # Check for cancellation during data fetching
            if cancel_event and cancel_event.is_set():
                print(f"[reddit_fetcher.py] Data fetching cancelled")
                break

            # Skip posts from AutoModerator
            if submission.author and str(submission.author).lower() == 'automoderator':
                continue

            # Apply date filtering if timestamps are provided
            if start_timestamp and submission.created_utc < start_timestamp:
                continue
            if end_timestamp and submission.created_utc > end_timestamp:
                continue

            matched.append(submission)

        matched.sort(key=lambda s: s.created_utc, reverse=True)
        print(f"[reddit_fetcher.py] Relevance search matched {len(matched)} posts in range; keeping {min(len(matched), num_posts)}")

        for submission in matched[:num_posts]:
            if cancel_event and cancel_event.is_set():
                print(f"[reddit_fetcher.py] Data fetching cancelled")
                break

            submission_data = {
                'id': submission.id,
                'title': submission.title,
                'content': submission.selftext if hasattr(submission, 'selftext') else '',
                'score': submission.score,
                'created_utc': submission.created_utc,
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
        # Fail the job with the real cause. Returning [] here used to surface as the
        # misleading "Cannot perform topic modeling on an empty document list."
        print(f"[reddit_fetcher.py] Error during keyword search: {str(e)}")
        message = str(e) if isinstance(e, RuntimeError) else describe_reddit_error(e, subreddit)
        raise RuntimeError(f"Keyword search for '{keyword}' failed. {message}") from e