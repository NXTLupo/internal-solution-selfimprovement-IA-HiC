from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
import json
import os
import shutil
from flask_cors import CORS
from util.topic_model.BertTopic import analyze_topics, summarize_topics, calculate_topic_similarities, filter_redundant_keywords
from util.topic_model.user_engament import extract_engagement_metrics
from util.text_processing.topic_processor import process_posts_for_analysis, process_top_topics
from app.db.service.topic_model_service import (
    save_posts_to_database, 
    retrieve_posts_from_database, 
    log_data_collection_complete, 
    log_post_samples
)
from app.db.config.database import SessionLocal
from app.repositories.reddit_repository import RedditRepository
from dotenv import load_dotenv
from threading import Thread, Event
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.repositories.jobs_repositories import JobsRepository, update_job_status, generate_job_id
import traceback
import logging
import gc
from util.data_source.reddit_fetcher_topic_model import fetch_reddit_posts, fetch_reddit_posts_with_keyword
from util.llm_models.pgvector.pgvector import index_data_in_pgvector

topic_model_bp = Blueprint('topic_model', __name__)
CORS(topic_model_bp)

# Load environment variables from .env file
load_dotenv()

# Global dictionary to track running jobs and their cancellation events
running_jobs = {}

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
    startDate = data.get('startDate')
    endDate = data.get('endDate')
    process_images = data.get('process_images', True)

    

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
        
        # Create cancellation event for this job
        cancel_event = Event()
        running_jobs[job_id] = cancel_event
        
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
                'summary_limit': summary_limit,
                'startDate': startDate,
                'endDate': endDate,
                'process_images': process_images
            }
            
            # Create job in database
            job = jobs_repo.create_job(
                job_id=job_id,
                user_id=user_id,
                project_id=project_id,
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
                keyword,
                startDate,
                endDate,
                cancel_event,
                process_images
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
        
        # Update job status to failed
        update_job_status(
            job_id=job_id, 
            status='failed', 
            message='Topic modeling failed', 
            error=error_msg
        )
        
        # Clean up the job from tracking
        if job_id in running_jobs:
            del running_jobs[job_id]
        
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
    keyword='',
    startDate=None,
    endDate=None,
    cancel_event=None,
    process_images=True
):
    """Process the topic modeling job in the background"""
    try:
        # Helper function to check for cancellation
        def check_cancellation():
            if cancel_event and cancel_event.is_set():
                print(f"[topic_model.py] Job {job_id} was cancelled")
                update_job_status(job_id, 'cancelled', 'Job was cancelled by user request')
                # Clean up the job from tracking
                if job_id in running_jobs:
                    del running_jobs[job_id]
                return True
            return False
        
        # Check for cancellation at the start
        if check_cancellation():
            return [], {}
        
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
        
        # Check for cancellation before fetching posts
        if check_cancellation():
            return [], {}
        
        # Add progress update for image processing if enabled
        if process_images:
            update_job_status(job_id, 'processing', 'Fetching posts from Reddit (with image processing)', progress=8)
        else:
            update_job_status(job_id, 'processing', 'Fetching posts from Reddit', progress=8)
        
        # Check for cancellation before fetching posts
        if check_cancellation():
            return [], {}
        
        # Check if keyword is provided and use the appropriate function
        if keyword:
            new_posts_from_api = fetch_reddit_posts_with_keyword(
                subreddit=subreddit,
                keyword=keyword,
                num_posts=num_posts,
                max_comments_per_post=max_comments_per_post,
                log_dir=log_dir,
                sort=sort,
                startDate=startDate,
                endDate=endDate,
                cancel_event=cancel_event,
                process_images=process_images
            )
            
            # STEP 2: Save posts to database
            save_posts_to_database(subreddit, new_posts_from_api)
            
            # Check for cancellation after saving posts
            if check_cancellation():
                return [], {}
            
            # For keyword searches, we only want to analyze the posts directly from the API
            raw_reddit_data = new_posts_from_api
            existing_post_ids = set(post['id'] for post in new_posts_from_api)
            
            # Log step 2: Data collection complete for keyword search
            log_data_collection_complete(log_dir, subreddit, new_posts_from_api, raw_reddit_data, startDate, endDate)
                
        else:
            # No keyword - use the standard approach
            new_posts_from_api = fetch_reddit_posts(
                subreddit=subreddit,
                num_posts=num_posts,
                max_comments_per_post=max_comments_per_post,
                log_dir=log_dir,
                sort=sort,
                startDate=startDate,
                endDate=endDate,
                cancel_event=cancel_event,
                process_images=process_images
            )
            
            # STEP 2: Save posts to database
            save_posts_to_database(subreddit, new_posts_from_api)
        
            # STEP 3: Retrieve all posts for this subreddit from the database and process them
            update_job_status(job_id, 'processing', 'Retrieving posts from database', progress=9)
            
            # Check for cancellation before database retrieval
            if check_cancellation():
                return [], {}
                
            raw_reddit_data, existing_post_ids = retrieve_posts_from_database(subreddit, log_dir, startDate, endDate)
        
        # STEP 4: Process all data to build document corpus
        update_job_status(job_id, 'processing', 'Analyzing topics', progress=50)
        
        # Check for cancellation before document processing
        if check_cancellation():
            return [], {}
            
        documents, post_ids, scores, post_data = process_posts_for_analysis(raw_reddit_data, max_comments_per_post)
        
        # Log sample data
        log_post_samples(log_dir, post_data, documents)

        # STEP 5: Perform topic modeling
        topic_model, topics, _ = analyze_topics(documents, post_ids, scores)
        topic_info = topic_model.get_topic_info()

        # Calculate topic similarities
        update_job_status(job_id, 'processing', 'Calculating topic similarities', progress=60)
        
        # Check for cancellation before similarity calculation
        if check_cancellation():
            return [], {}
            
        topic_similarities = calculate_topic_similarities(topic_model, topic_info)
        
        # Log step 4: Topic modeling results
        with open(os.path.join(log_dir, '4_topic_modeling_results.json'), 'w', encoding='utf-8') as f:
            topic_data = []
            for topic in topic_info.itertuples():
                if topic.Topic != -1:  
                    # Get raw topic terms and filter them
                    raw_topic_terms = topic_model.get_topic(topic.Topic)
                    filtered_topic_terms = filter_redundant_keywords(raw_topic_terms, max_words=10)
                    topic_terms = [{"term": str(term), "weight": float(weight)} 
                                  for term, weight in filtered_topic_terms]
                    topic_data.append({
                        "topic_id": int(topic.Topic),
                        "count": int(topic.Count),
                        "name": str(topic.Name),
                        "representation": topic_terms  # Already limited by filter
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
        update_job_status(job_id, 'processing', 'Generating summaries and metrics', progress=70)
        
        # Check for cancellation before summary generation
        if check_cancellation():
            return [], {}
            
        topic_summaries = summarize_topics(topic_model, topics, documents, summary_limit, keyword=keyword)
        
        # Log step 6: Topic summaries results
        with open(os.path.join(log_dir, '6_topic_summaries_results.json'), 'w', encoding='utf-8') as f:
            json.dump(topic_summaries, f, indent=2)
        

        # STEP 7: Process top topics and perform sentiment analysis
        update_job_status(job_id, 'processing', 'Extracting evidence points', progress=80)
        
        # Check for cancellation before topic processing
        if check_cancellation():
            return [], {}
            
        sentiment_results, topic_engagement_metrics = process_top_topics(
            topic_model, topic_info, topics, documents, post_ids, post_data, topic_summaries,
            response, log_dir, topics_limit, job_id, cancel_event
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
        update_job_status(job_id, 'processing', 'Generating summaries and metrics', progress=90)
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
            update_job_status(job_id, 'processing', 'Saving results', progress=99)
            pgvector_result = index_data_in_pgvector(subreddit, raw_reddit_data, log_dir)
            response['pgvector_indexing'] = pgvector_result
        
        # Save analysis result to database
        update_job_status(job_id, 'processing', 'Saving results', progress=99)
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
                project_id=project_id,
                start_date=startDate,
                end_date=endDate
            )
            
            print(f"[topic_model.py] Analysis result saved to database with ID: {analysis_id}")
            
            # Add the analysis ID to the response
            response['analysis_id'] = analysis_id
            
            # Update job status to completed with analysis_id
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
        
        # Clean up the job from tracking
        if job_id in running_jobs:
            del running_jobs[job_id]
        
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
        
        # Clean up the job from tracking
        if job_id in running_jobs:
            del running_jobs[job_id]
        
        # Clean up in case of error to free memory
        for var_name in ['topic_model', 'documents', 'post_data', 'raw_reddit_data', 'topic_info', 'topics', 'topic_summaries']:
            if var_name in locals():
                del locals()[var_name]
        
        # Force garbage collection
        gc.collect()


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
    """Cancel a topic modeling job if it's still pending or processing"""
    try:
        # First, signal cancellation to the running process if it exists
        if job_id in running_jobs:
            cancel_event = running_jobs[job_id]
            cancel_event.set()  # Signal the process to stop
            print(f"[topic_model.py] Signaled cancellation for job {job_id}")
        
        # Cancel the job in the database
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            cancelled = jobs_repo.cancel_job(job_id)
            
            if cancelled:
                # Remove from tracking if still there
                if job_id in running_jobs:
                    del running_jobs[job_id]
                    
                return jsonify({
                    'job_id': job_id,
                    'status': 'cancelled',
                    'message': 'Job was cancelled by user request'
                })
            else:
                # Get the job to check its status
                job = jobs_repo.get_job_by_id(job_id)
                if not job:
                    # If job not found but was in running jobs, clean it up
                    if job_id in running_jobs:
                        del running_jobs[job_id]
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

@topic_model_bp.route('/project/<project_id>/cancel', methods=['DELETE'])
def cancel_jobs_by_project(project_id):
    """Cancel all topic modeling jobs associated with a project ID"""
    try:
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            
            # Get all jobs for this project that can be cancelled
            jobs_to_cancel = [job for job in jobs_repo.get_jobs_by_project_id(project_id) 
                            if job.status in ["pending", "processing"]]
            
            # Signal cancellation to any running processes
            cancelled_job_ids = []
            for job in jobs_to_cancel:
                if job.id in running_jobs:
                    cancel_event = running_jobs[job.id]
                    cancel_event.set()  # Signal the process to stop
                    print(f"[topic_model.py] Signaled cancellation for job {job.id}")
                cancelled_job_ids.append(job.id)
            
            # Cancel all jobs in the database
            cancelled_count = jobs_repo.cancel_jobs_by_project_id(project_id)
            
            # Clean up tracking for cancelled jobs
            for job_id in cancelled_job_ids:
                if job_id in running_jobs:
                    del running_jobs[job_id]
            
            return jsonify({
                'project_id': project_id,
                'status': 'cancelled',
                'message': f'{cancelled_count} jobs were cancelled for project {project_id}',
                'cancelled_job_count': cancelled_count,
                'cancelled_job_ids': cancelled_job_ids
            })
            
        finally:
            db.close()
            # Clean up resources
            del jobs_repo
            if 'jobs_to_cancel' in locals():
                del jobs_to_cancel
            if 'cancelled_job_ids' in locals():
                del cancelled_job_ids
            gc.collect()
                
    except Exception as e:
        error_msg = f"Error cancelling jobs for project {project_id}: {str(e)}"
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

@topic_model_bp.route('/jobs/project/<project_id>', methods=['GET'])
def get_jobs_by_project(project_id):
    """Get all jobs associated with a project ID"""
    try:
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            jobs = jobs_repo.get_jobs_by_project_id(project_id)
            
            # Convert to JSON serializable format
            jobs_list = []
            for job in jobs:
                job_dict = {
                    'job_id': job.id,
                    'user_id': job.user_id,
                    'status': job.status,
                    'message': job.message,
                    'created_at': job.created_at.isoformat(),
                    'updated_at': job.updated_at.isoformat(),
                    'parameters': job.parameters
                }
                
                if job.progress is not None:
                    job_dict['progress'] = job.progress
                
                if job.error:
                    job_dict['error'] = job.error
                
                if job.analysis_id:
                    job_dict['analysis_id'] = job.analysis_id
                
                jobs_list.append(job_dict)
            
            response = jsonify({
                'project_id': project_id,
                'jobs': jobs_list,
                'total_jobs': len(jobs_list)
            })
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
        error_msg = f"Error retrieving jobs for project {project_id}: {str(e)}"
        print(error_msg)
        # Force garbage collection
        gc.collect()
        return jsonify({'error': error_msg}), 500
