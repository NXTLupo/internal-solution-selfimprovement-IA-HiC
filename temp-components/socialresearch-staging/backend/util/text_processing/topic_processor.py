"""
Topic processing utilities for analyzing posts and processing top topics.

This module contains functions moved from api_topic_model.py to make the API cleaner
and provide better separation of concerns.
"""

import os
import json
import gc
import traceback
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from util.topic_model.extract_sentiment_evidence import extract_sentiment_evidence, analyze_post_sentiment
from util.topic_model.BertTopic import analyze_topic_sentiment, filter_redundant_keywords
from app.repositories.jobs_repositories import update_job_status


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


def process_top_topics(topic_model, topic_info, topics, documents, post_ids, post_data, topic_summaries,
                      response, log_dir, topics_limit, job_id=None, cancel_event=None):
    """
    Process top topics to extract sentiment analysis and evidence.
    
    Args:
        topic_model: The BERTopic model instance
        topic_info: DataFrame with topic information
        topics: List of topic assignments for each document
        documents: List of document texts
        post_ids: List of post IDs corresponding to documents
        post_data: List of post metadata
        topic_summaries: Dictionary of topic summaries
        response: Response object to populate with results
        log_dir: Directory for logging outputs
        topics_limit: Maximum number of topics to process
        job_id: Optional job ID for status updates
        cancel_event: Optional cancellation event for job control
        
    Returns:
        tuple: (sentiment_results, topic_engagement_metrics)
    """
    # Helper function to check for cancellation within this function
    def check_cancellation():
        if cancel_event and cancel_event.is_set():
            print(f"[topic_model.py] Job {job_id} was cancelled during topic processing")
            return True
        return False
    
    # Check for cancellation at the start of topic processing
    if check_cancellation():
        return [], {}
    
    # Create a safe string for logging and ensure topics_limit is an integer if provided
    if topics_limit is not None and isinstance(topics_limit, int):
        limit_str = str(topics_limit)
    else:
        # Set a default limit of 15 topics
        topics_limit = 15
        limit_str = "15"
        
    print(f"[topic_model.py] Processing {limit_str} topics", topic_info)
    sentiment_results = []
    topic_engagement_metrics = {}
    
    # Get top topics, limited to 15 max
    if topics_limit is not None and isinstance(topics_limit, int):
        top_topics = topic_info[topic_info['Topic'] != -1].nlargest(min(topics_limit, 15), 'Count')
    else:
        top_topics = topic_info[topic_info['Topic'] != -1].nlargest(15, 'Count')
    
    temp_dir = os.path.join(os.getenv('TOPIC_LOG_DIR', 'log_topic'), 'topic_sentiment')
    os.makedirs(temp_dir, exist_ok=True)
    
    # Delete all files in temp_dir if it exists
    if os.path.exists(temp_dir):
        for file in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, file)
            if os.path.isfile(file_path):
                os.remove(file_path)
    
    # Prepare topics data for multithreaded processing
    topics_data = []
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
        
        # Check for cancellation before sentiment analysis
        if check_cancellation():
            return [], {}
                    
        sentiment_category, sentiment_score = analyze_topic_sentiment(topic_docs, topic_id, temp_dir)
        
        sentiment_results.append({
            "topic_id": topic_id,
            "sentiment_category": sentiment_category,  
            "sentiment_score": float(sentiment_score)
        })
        
        # Analyze sentiment for each post in this topic
        post_sentiments = {}
        
        # Check for cancellation before processing individual posts
        if check_cancellation():
            return [], {}
            
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
        
        # Store data needed for each topic's sentiment evidence extraction
        topics_data.append({
            'topic_id': topic_id,
            'topic_docs': topic_docs,
            'topic_posts': topic_posts,
            'topic_posts_ids': topic_posts_ids,
            'post_sentiments': post_sentiments,
            'count': int(topic.Count),
            'score': float(sentiment_score)
        })
    
    # Function to process sentiment evidence in worker threads
    def process_sentiment_evidence(topic_data):      
        # Extract sentiment evidence
        sentiment_evidence = extract_sentiment_evidence(
            topic_data['topic_docs'],
            topic_data['topic_posts'],
            topic_data['topic_posts_ids'],
            temp_dir
        )
        
        # Log sentiment evidence
        with open(os.path.join(log_dir, f'8_2_topic_{topic_data["topic_id"]}_sentiment_evidence.json'), 'w', encoding='utf-8') as f:
            json.dump(sentiment_evidence, f, indent=2)
            
        # Clean up resources
        del topic_data['topic_docs']
        del topic_data['topic_posts']
        
        # Force garbage collection
        gc.collect()
        
        return {
            'topic_id': topic_data['topic_id'],
            'sentiment_evidence': sentiment_evidence,
            'post_sentiments': topic_data['post_sentiments'],
            'count': topic_data['count'],
            'score': topic_data['score']
        }

    # Process topics with multithreading (3 workers)
    results = []
    
    print(f"[topic_model.py] Processing sentiment evidence for {len(topics_data)} topics with 3 worker threads")
    if job_id:
        update_job_status(job_id, 'processing', 'Extracting evidence points with multiple workers', progress=75)
        
    with ThreadPoolExecutor(max_workers=3) as executor:
        # Submit all tasks and store futures
        futures = [executor.submit(process_sentiment_evidence, topic_data) for topic_data in topics_data]
        
        # Process results as they complete
        for future in as_completed(futures):
            try:
                result = future.result()
                results.append(result)
                if job_id:
                    update_job_status(
                        job_id, 
                        'processing', 
                        f"Completed evidence extraction for topic {result['topic_id']}", 
                        progress=75 + (15 * len(results) // len(topics_data))
                    )
            except Exception as e:
                print(f"[topic_model.py] Error in worker thread: {str(e)}")
                import traceback
                print(traceback.format_exc())

    # Now process the results to build the response
    for result in results:
        topic_id = result['topic_id']
        sentiment_evidence = result['sentiment_evidence']
        post_sentiments = result['post_sentiments']

        # Get raw topic terms and apply filtering for redundancy and quality
        raw_topic_terms = topic_model.get_topic(topic_id)
        filtered_topic_terms = filter_redundant_keywords(raw_topic_terms, max_words=10)
        
        # Convert to the expected format
        terms = [{'term': str(term), 'weight': float(weight)} 
                for term, weight in filtered_topic_terms]

        # Use the filtered terms
        topic_data = {
            'id': topic_id,
            'count': result['count'],
            'score': result['score'],
            'engagement': topic_engagement_metrics[topic_id],
            'terms': terms,
            'post_ids': [post_id for post_id in post_sentiments.keys()],
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
        if result['score'] > 0.15:
            response['topics']['positive']['topics'].append(topic_data)
            response['topics']['positive']['count'] += 1
        elif result['score'] < -0.20:
            response['topics']['negative']['topics'].append(topic_data)
            response['topics']['negative']['count'] += 1
        else:
            response['topics']['neutral']['topics'].append(topic_data)
            response['topics']['neutral']['count'] += 1

    # Clean up the temp directory
    if os.path.exists(temp_dir):
        for file in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, file)
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Failed to remove file {file_path}: {e}")

    # Clean up memory
    del topics_data
    del results
    gc.collect()

    return sentiment_results, topic_engagement_metrics 