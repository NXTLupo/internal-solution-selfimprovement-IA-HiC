"""
Mock data generators for testing.
"""
import json
import datetime
import uuid

def generate_mock_job_id():
    """Generate a mock job ID"""
    return f"job-{uuid.uuid4()}"

def generate_mock_analysis_id():
    """Generate a mock analysis ID"""
    return f"analysis-{uuid.uuid4()}"

def create_mock_job(job_id=None, user_id="test-user", status="pending"):
    """Create a mock job"""
    if job_id is None:
        job_id = generate_mock_job_id()
        
    return {
        "job_id": job_id,
        "user_id": user_id,
        "status": status,
        "message": f"Job {status}",
        "progress": 0 if status == "pending" else 100,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": datetime.datetime.now().isoformat(),
        "parameters": {
            "subreddit": "python",
            "num_posts": 10,
            "max_comments": 5
        }
    }

def create_mock_reddit_post(post_id=None, subreddit="python"):
    """Create a mock Reddit post"""
    if post_id is None:
        post_id = f"post-{uuid.uuid4().hex[:8]}"
        
    return {
        "id": post_id,
        "subreddit": subreddit,
        "title": f"Test post in {subreddit}",
        "selftext": f"This is a test post in the {subreddit} subreddit for testing purposes.",
        "author": "test_user",
        "created_utc": int(datetime.datetime.now().timestamp()),
        "score": 10,
        "comments": create_mock_comments(3)
    }

def create_mock_comments(count=3):
    """Create a list of mock comments"""
    comments = []
    for i in range(count):
        comments.append({
            "id": f"comment-{uuid.uuid4().hex[:8]}",
            "body": f"This is comment {i+1}",
            "author": f"commenter_{i+1}",
            "created_utc": int(datetime.datetime.now().timestamp()),
            "score": 5
        })
    return comments

def create_mock_topic_model_result(num_topics=5):
    """Create a mock topic model result"""
    topics = {}
    
    for i in range(1, num_topics + 1):
        topics[i] = {
            "id": i,
            "name": f"Topic {i}",
            "keywords": [f"keyword{j}" for j in range(1, 6)],
            "score": round(0.9 - (i * 0.1), 2),
            "count": 50 - (i * 5),
            "documents": [f"doc{j}" for j in range(1, 6)],
            "representative_docs": [f"This is document {j} for topic {i}" for j in range(1, 4)],
            "sentiment": {
                "score": round(0.5 + (i * 0.1), 2),
                "label": "positive" if i % 2 == 0 else "negative"
            }
        }
    
    return {
        "topics": topics,
        "metadata": {
            "subreddit": "python",
            "post_count": 100,
            "comment_count": 300,
            "created_at": datetime.datetime.now().isoformat(),
            "job_id": generate_mock_job_id()
        }
    }

def save_mock_data_to_file(data, filename):
    """Save mock data to a file"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    return filename

def load_mock_data_from_file(filename):
    """Load mock data from a file"""
    with open(filename, 'r') as f:
        return json.load(f) 