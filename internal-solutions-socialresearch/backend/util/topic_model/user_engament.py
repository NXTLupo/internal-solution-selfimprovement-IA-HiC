def extract_engagement_metrics(posts_data):
    """
    Extract detailed engagement metrics from Reddit posts
    
    Args:
        posts_data: List of post dictionaries containing post information and comments
        
    Returns:
        Dictionary of engagement metrics
    """
    if not posts_data:
        return {
            'error': 'No posts data available for analysis'
        }
    
    # Basic metrics
    total_posts = len(posts_data)
    total_comments = sum(post.get('comments_count', 0) for post in posts_data)
    total_score = sum(post.get('score', 0) for post in posts_data)
    
    # Calculate averages
    avg_comments_per_post = total_comments / total_posts if total_posts > 0 else 0
    avg_score_per_post = total_score / total_posts if total_posts > 0 else 0
    
    # Analyze comment depth if available
    comment_depth_data = analyze_comment_depth(posts_data) if has_comment_tree_data(posts_data) else None
    
    # Calculate response times if timestamp data is available
    response_times = calculate_response_times(posts_data) if has_timestamp_data(posts_data) else None
    
    # Compile all metrics
    metrics = {
        'basic_metrics': {
            'total_posts': total_posts,
            'total_comments': total_comments,
            'total_score': total_score,
            'avg_comments_per_post': avg_comments_per_post,
            'avg_score_per_post': avg_score_per_post,
        },
        'engagement_distribution': {
            'high_engagement_posts': len([p for p in posts_data if p.get('comments_count', 0) > avg_comments_per_post * 2]),
            'medium_engagement_posts': len([p for p in posts_data if avg_comments_per_post / 2 <= p.get('comments_count', 0) <= avg_comments_per_post * 2]),
            'low_engagement_posts': len([p for p in posts_data if p.get('comments_count', 0) < avg_comments_per_post / 2])
        }
    }
    
    # Add optional metrics if data is available
    if comment_depth_data:
        metrics['comment_depth_distribution'] = comment_depth_data
    
    if response_times:
        metrics['response_time_analysis'] = response_times
    
    return metrics

def has_comment_tree_data(posts_data):
    """Check if the posts data contains comment tree information"""
    if not posts_data:
        return False
    
    # Check if at least one post has a comments field with reply structure
    for post in posts_data:
        if 'comments' in post and isinstance(post['comments'], list) and post['comments']:
            # Check if comments have a 'replies' field
            for comment in post['comments']:
                if isinstance(comment, dict) and 'replies' in comment:
                    return True
    
    return False

def has_timestamp_data(posts_data):
    """Check if the posts data contains timestamp information"""
    if not posts_data:
        return False
    
    # Check if posts have created_utc field
    for post in posts_data:
        if 'created_utc' in post:
            return True
        
        # Check if comments have created_utc field
        if 'comments' in post and isinstance(post['comments'], list) and post['comments']:
            for comment in post['comments']:
                if isinstance(comment, dict) and 'created_utc' in comment:
                    return True
    
    return False

def analyze_comment_depth(posts_data):
    """
    Analyze the depth of comment threads
    
    Args:
        posts_data: List of post dictionaries with comment tree information
        
    Returns:
        Dictionary with comment depth metrics
    """
    # Initialize counters for different depth levels
    depth_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0}
    max_depth_post = {'post_id': None, 'depth': 0}
    
    for post in posts_data:
        if 'comments' not in post or not isinstance(post['comments'], list):
            continue
        
        # Calculate max depth for this post
        post_max_depth = calculate_max_comment_depth(post['comments'])
        
        # Update max depth post if this one is deeper
        if post_max_depth > max_depth_post['depth']:
            max_depth_post = {'post_id': post.get('id'), 'depth': post_max_depth}
        
        # Increment the appropriate depth counter
        if post_max_depth >= 5:
            depth_counts['5+'] += 1
        else:
            depth_counts[post_max_depth] += 1
    
    # Calculate percentages
    total_posts_with_comments = sum(depth_counts.values())
    depth_distribution = {
        'depth_counts': depth_counts,
        'depth_percentages': {
            depth: (count / total_posts_with_comments * 100) if total_posts_with_comments > 0 else 0
            for depth, count in depth_counts.items()
        },
        'max_depth_post': max_depth_post,
        'avg_max_depth': sum(depth * count for depth, count in depth_counts.items() 
                            if isinstance(depth, int)) / total_posts_with_comments if total_posts_with_comments > 0 else 0
    }
    
    return depth_distribution

def calculate_max_comment_depth(comments, current_depth=1):
    """
    Recursively calculate the maximum depth of a comment tree
    
    Args:
        comments: List of comment dictionaries
        current_depth: Current depth in the recursion
        
    Returns:
        Maximum depth found
    """
    if not comments:
        return current_depth - 1
    
    max_depth = current_depth
    
    for comment in comments:
        if isinstance(comment, dict) and 'replies' in comment and comment['replies']:
            reply_depth = calculate_max_comment_depth(comment['replies'], current_depth + 1)
            max_depth = max(max_depth, reply_depth)
    
    return max_depth

def calculate_response_times(posts_data):
    """
    Calculate response time metrics for posts
    
    Args:
        posts_data: List of post dictionaries with timestamp information
        
    Returns:
        Dictionary with response time metrics
    """
    response_times = []
    posts_with_responses = 0
    
    for post in posts_data:
        if 'created_utc' not in post or 'comments' not in post or not post['comments']:
            continue
        
        post_time = post['created_utc']
        
        # Find earliest comment time
        earliest_comment_time = None
        for comment in post['comments']:
            if isinstance(comment, dict) and 'created_utc' in comment:
                if earliest_comment_time is None or comment['created_utc'] < earliest_comment_time:
                    earliest_comment_time = comment['created_utc']
        
        if earliest_comment_time is not None:
            # Calculate response time in minutes
            response_time = (earliest_comment_time - post_time) / 60
            response_times.append(response_time)
            posts_with_responses += 1
    
    if not response_times:
        return None
    
    # Calculate metrics
    avg_response_time = sum(response_times) / len(response_times)
    median_response_time = sorted(response_times)[len(response_times) // 2]
    
    # Group response times into buckets
    response_buckets = {
        'under_5min': len([t for t in response_times if t < 5]),
        '5_15min': len([t for t in response_times if 5 <= t < 15]),
        '15_30min': len([t for t in response_times if 15 <= t < 30]),
        '30_60min': len([t for t in response_times if 30 <= t < 60]),
        '1_3hr': len([t for t in response_times if 60 <= t < 180]),
        'over_3hr': len([t for t in response_times if t >= 180])
    }
    
    return {
        'avg_response_time_minutes': avg_response_time,
        'median_response_time_minutes': median_response_time,
        'fastest_response_minutes': min(response_times) if response_times else None,
        'slowest_response_minutes': max(response_times) if response_times else None,
        'response_time_distribution': response_buckets,
        'posts_with_no_response': len(posts_data) - posts_with_responses
    }
