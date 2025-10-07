from flask import Blueprint, request, jsonify, Response, current_app
import uuid
from datetime import datetime
import praw
from dotenv import load_dotenv
import json
from flask_cors import CORS
from util.llm_models.deepseek import get_single_deepseek_completion, get_json_deepseek_completion
from util.prompts.reddit_prompt import get_category_merger_prompt, get_reddit_pros_cons_prompt, get_point_merger_prompt, openai_get_reddit_pros_cons_prompt, get_ai_summary_prompt
from util.llm_models.openai import get_openai_completion
from util.llm_models.claude import get_claude_completion, get_claude_completion_with_json
from util.topic_model.BertTopic import get_all_comments, analyze_topics, summarize_topics, analyze_topic_sentiment, calculate_topic_similarities
from util.topic_model.user_engament import extract_engagement_metrics

from util.text_processing.post_processor import TextProcessor
from util.text_processing.filtering_cluster import Filtering
from util.text_processing.filtering_ABSA import FilteringABSA
from util.text_processing.filtering_roberta import FilteringRoBERTa
from util.text_processing.chunking import chunk_filtered_data
# from util.llm_models.openai import get_openai_completion
from util.text_processing.merge_ds import merge_similar_points
import os
import glob
from util.text_processing.merge_sbert import PointMerger
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from app.db.config.database import SessionLocal
from app.repositories.reddit_repository import RedditRepository
from app.repositories.jobs_repositories import JobsRepository, generate_job_id, update_job_status
from app.db.service.reddit_service import get_subreddit_statistics
import re
from threading import Thread
import traceback

# Changed blueprint name to avoid conflict with reddit API blueprint
llm_analyzer_bp = Blueprint('llm_analyzer', __name__)
CORS(llm_analyzer_bp)

load_dotenv()

# Initialize Reddit API client
reddit = praw.Reddit(
    client_id=os.getenv('REDDIT_CLIENT_ID'),
    client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
    user_agent=os.getenv('REDDIT_USER_AGENT'),
)

text_processor = TextProcessor()

def process_sentiment_analysis_job(
    job_id, 
    search_params,  # Changed from search_id to search_params
    application_name, 
    filter_type, 
    keyword, 
    merge_method, 
    chunk_size, 
    analysis_model, 
    max_workers, 
    skip_filtering,
    user_id,
    project_id
):
    """Process the sentiment analysis job in the background"""
    try:
        update_job_status(job_id, 'processing', 'Setting up analysis environment')
        
        setup_temp_directory()

        # First, perform Reddit search with the provided parameters
        update_job_status(job_id, 'processing', 'Searching Reddit posts', progress=1)
        
        try:
            subreddit_obj = reddit.subreddit(search_params['subreddit'])
            
            search_results = []
            for submission in subreddit_obj.search(
                search_params['query'], 
                limit=search_params.get('limit', 5),
                sort=search_params.get('sort', 'relevance'),
                time_filter=search_params.get('time', 'all')
            ):
                # Fetch comments
                submission.comments.replace_more(limit=0)
                
                def get_comment_data(comment, depth=0, max_depth=2):
                    if depth > max_depth:
                        return None
                    
                    comment_data = {
                        'id': comment.id,
                        'body': comment.body,
                        'score': comment.score,
                        'created_utc': comment.created_utc,
                        'author': str(comment.author) if comment.author else '[deleted]',
                        'replies': []
                    }
                    
                    # Get up to 10 replies for this comment
                    if comment.replies and depth < max_depth:
                        for reply in list(comment.replies)[:10]:
                            reply_data = get_comment_data(reply, depth + 1, max_depth)
                            if reply_data:
                                comment_data['replies'].append(reply_data)
                    
                    return comment_data

                # Get top-level comments
                comments = []
                for comment in list(submission.comments)[:10]:
                    comment_data = get_comment_data(comment, depth=0)
                    if comment_data:
                        comments.append(comment_data)

                search_results.append({
                    'id': submission.id,
                    'title': submission.title,
                    'score': submission.score,
                    'created_utc': submission.created_utc,
                    'selftext': submission.selftext if hasattr(submission, 'selftext') else None,
                    'comments': comments,
                    'url': submission.url,
                    'permalink': submission.permalink,
                    'num_comments': submission.num_comments,
                    'author': str(submission.author) if submission.author else '[deleted]'
                })
            
            # Create search data structure
            search_data = {
                'status': 'completed',
                'created_at': datetime.utcnow().isoformat(),
                'subreddit': search_params['subreddit'],
                'parameters': {
                    'query': search_params['query'],
                    'limit': search_params.get('limit', 5),
                    'sort': search_params.get('sort', 'relevance'),
                    'time': search_params.get('time', 'all')
                },
                'results': search_results
            }
            
        except Exception as e:
            update_job_status(
                job_id, 
                'failed', 
                'Failed to search Reddit', 
                error=f'Reddit search error: {str(e)}'
            )
            return

        # Save initial search data
        with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), '1.search_data.json'), 'w', encoding='utf-8') as f:
            json.dump(search_data, f, indent=2)
        
        update_job_status(job_id, 'processing', 'Processing and filtering data', progress=5)
        
        if skip_filtering:
            # Skip filtering steps but directly format the search data
            formatted_data = {}
            
            for i, post in enumerate(search_data.get('results', []), 1):
                post_content = f"Title: {post.get('title', '')}\n"
                post_content += f"Content: {post.get('selftext', '')}\n"
                post_content += f"Score: {post.get('score', 0)}\n"
                
                if 'comments' in post and post['comments']:
                    post_content += "Top Comments:\n"
                    for comment in post['comments']:
                        comment_text = comment.get('body', '')
                        if comment_text:
                            post_content += f"- {comment_text}\n"
                            if 'replies' in comment and comment['replies']:
                                for reply in comment['replies']:
                                    post_content += f"  - {reply.get('body', '')}\n"
                
                formatted_data[f"post {i}"] = post_content
            
            # Create a minimal filtered_data structure when skipping filtering
            filtered_data = {
                'results': search_data.get('results', [])
            }
        else:
            # Process and filter data
            update_job_status(job_id, 'processing', 'Processing Reddit data', progress=10)
            processed_data = text_processor.process_reddit_data(search_data)
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), '2.processed_data.json'), 'w', encoding='utf-8') as f:
                json.dump(processed_data, f, indent=2)

            # Apply filters
            update_job_status(job_id, 'processing', 'Applying RoBERTa filtering', progress=15)
            filtering_roberta = FilteringRoBERTa()
            roberta_filtered_data = filtering_roberta.filter_data(processed_data, keyword=keyword)
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), '3.roberta_filtered.json'), 'w', encoding='utf-8') as f:
                json.dump(roberta_filtered_data, f, indent=2)

            update_job_status(job_id, 'processing', f'Applying {filter_type} filtering', progress=20)
            if filter_type == "cluster":
                filtering_cluster = Filtering()
                filtered_data = filtering_cluster.filter_data(roberta_filtered_data)
                with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), '3.1.cluster_filtered.json'), 'w', encoding='utf-8') as f:
                    json.dump(filtered_data, f, indent=2)
            else:
                filtering_absa = FilteringABSA()
                filtered_data = filtering_absa.filter_data(roberta_filtered_data, keyword=keyword)
                with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), '3.1.absa_filtered.json'), 'w', encoding='utf-8') as f:
                    json.dump(filtered_data, f, indent=2)

            formatted_data = text_processor.format_filtered_data(filtered_data)
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), '4.filtered_data.json'), 'w', encoding='utf-8') as f:
                json.dump(formatted_data, f, indent=2)

        # Chunk the data
        update_job_status(job_id, 'processing', 'Chunking data for analysis', progress=25)
        chunked_data = chunk_filtered_data(formatted_data, chunk_size=chunk_size)
        for i, chunk in enumerate(chunked_data):
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), f'5.{i+1}.chunk_data.json'), 'w', encoding='utf-8') as f:
                json.dump(chunk, f, indent=2)

        # Initialize thread pool executor, this is only for processing the chunking process
        chunk_results = []
        max_workers_count = min(len(chunked_data), max_workers)  # Limit max parallel threads
        
        update_job_status(job_id, 'processing', f'Processing {len(chunked_data)} chunks with {max_workers_count} workers', progress=30)
        
        with ThreadPoolExecutor(max_workers=max_workers_count) as executor:
            # Submit all chunks for parallel processing
            future_to_chunk = {
                executor.submit(process_chunk, chunk, chunk_idx, application_name, method=analysis_model): chunk_idx 
                for chunk_idx, chunk in enumerate(chunked_data)
            }
            
            # Track progress for completed chunks
            completed_chunks = 0
            total_chunks = len(chunked_data)
            
            # Collect results as they complete
            for future in as_completed(future_to_chunk):
                chunk_idx = future_to_chunk[future]
                try:
                    result = future.result()
                    if result:
                        chunk_results.append(result)
                    
                    # Update progress based on completed chunks
                    completed_chunks += 1
                    progress_pct = 30 + int((completed_chunks / total_chunks) * 50)
                    update_job_status(
                        job_id, 
                        'processing', 
                        f'Processed chunk {completed_chunks}/{total_chunks}',
                        progress=progress_pct
                    )
                except Exception as e:
                    logging.error(f"Error processing chunk {chunk_idx}: {str(e)}")
                    continue

        # Merge results
        update_job_status(job_id, 'processing', 'Merging analysis results', progress=85)
        json_data_list = []
        for result_file in chunk_results:
            with open(result_file, 'r', encoding='utf-8') as f:
                try:
                    json_data = json.loads(f.read())
                    json_data_list.append(json_data)
                except json.JSONDecodeError as e:
                    logging.error(f"Error parsing JSON from {result_file}: {str(e)}")
                    continue

        final_result = merge_and_categorize_results(json_data_list)
        
        if 'results' in filtered_data:
            for i, post in enumerate(filtered_data['results'], 1):
                post['id'] = i

        combined_response = {
            "merged_result": final_result,
            "formatted_data": filtered_data
        }

        with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), '11.result.json'), 'w', encoding='utf-8') as f:
            json.dump(combined_response, f, indent=2)
        
        update_job_status(job_id, 'processing', 'Saving analysis results to database', progress=95)
        
        # Save the result to the database
        try:
            db = SessionLocal()
            repo = RedditRepository(db)
            
            # Extract metadata from search data and request
            subreddit = search_data.get('subreddit', '')
            topic = application_name
            post_count = len(search_data.get('results', []))
            sort_by = search_data.get('parameters', {}).get('sort', '')
            time_period = search_data.get('parameters', {}).get('time', '')
            
            # Save analysis result using repository method
            analysis_id = repo.save_analysis_result(
                user_id=user_id,
                data=combined_response,
                analysis_type='sentiment',
                subreddit=subreddit,
                topic=topic,
                post_count=post_count,
                sort_by=sort_by,
                time_period=time_period,
                project_id=project_id
            )
            
            # Add the analysis ID to the response
            combined_response["analysis_id"] = analysis_id
            
            # Associate the job with the analysis result
            jobs_repo = JobsRepository(db)
            jobs_repo.update_job_status(
                job_id=job_id,
                status='processing',
                message='Generating AI summary',
                progress=98,
                analysis_id=analysis_id
            )
            
            update_job_status(job_id, 'processing', 'Generating AI summary', progress=98)
            
            # Call AI summary endpoint synchronously and wait for the response

            # I'm not sure if this is the best way to do this, but it works for now
            ai_summary_result = None
            try:
                import requests

                base_url = os.getenv('VITE_API_BASE_URL')
                
                ai_summary_url = f"{base_url}/api/llm-analyzer/ai-summary"
                summary_payload = {
                    "analysisData": {
                        "positive": final_result.get("positive", []),
                        "negative": final_result.get("negative", []),
                        "applicationName": application_name
                    },
                    "projectId": project_id,
                }
                
                response = requests.post(ai_summary_url, json=summary_payload, timeout=180) 
                response.raise_for_status()
                
                ai_summary_result = response.json()
                
                # Add the AI summary to the combined response
                combined_response["ai_summary"] = ai_summary_result
                
            except requests.exceptions.RequestException as e:
                logging.error(f"Error calling AI summary endpoint: {str(e)}")
                # Optionally add error info to the response or handle differently
                combined_response["ai_summary_error"] = f"Failed to generate AI summary: {str(e)}"
            except Exception as e:
                logging.error(f"Error processing AI summary response: {str(e)}")
                combined_response["ai_summary_error"] = f"Error processing AI summary: {str(e)}"
                
        except Exception as e:
            logging.error(f"Error saving analysis result to database: {str(e)}")
            db_error = str(e)
            combined_response["db_error"] = db_error
        finally:
            if 'db' in locals():
                db.close()
            
        # Success - update job status with result
        update_job_status(
            job_id, 
            'completed', 
            'Analysis completed successfully', 
            progress=100, 
            result=combined_response
        )
        
    except Exception as e:
        error_msg = f"Error processing sentiment analysis: {str(e)}"
        error_trace = traceback.format_exc()
        logging.error(f"{error_msg}\n{error_trace}")
        
        # Update job with error details
        update_job_status(
            job_id, 
            'failed', 
            'Analysis failed', 
            error=error_msg
        )

@llm_analyzer_bp.route('/search', methods=['POST'])
def search_subreddit():
    """Search Reddit and return results"""
    try:
        data = request.get_json()

        # Extract search parameters
        subreddit = data.get('subreddit')
        query = data.get('query')
        limit = data.get('limit', 5)
        sort = data.get('sort', 'relevance')
        time_filter = data.get('time', 'all')

        # Validate required parameters
        if not subreddit or not query:
            return jsonify({'error': 'Missing required parameters: subreddit and query'}), 400

        # Generate a unique search ID
        search_id = str(uuid.uuid4())

        # Perform Reddit search
        try:
            subreddit_obj = reddit.subreddit(subreddit)

            search_results = []
            for submission in subreddit_obj.search(
                query,
                limit=limit,
                sort=sort,
                time_filter=time_filter
            ):
                # Fetch comments
                submission.comments.replace_more(limit=0)

                comments = []
                for comment in submission.comments.list()[:10]:  # Limit to first 10 comments
                    comments.append({
                        'id': comment.id,
                        'body': comment.body[:500],  # Limit comment length
                        'score': comment.score,
                        'author': str(comment.author) if comment.author else '[deleted]'
                    })

                search_results.append({
                    'id': submission.id,
                    'title': submission.title,
                    'selftext': submission.selftext[:1000],  # Limit text length
                    'score': submission.score,
                    'num_comments': submission.num_comments,
                    'url': submission.url,
                    'created_utc': submission.created_utc,
                    'author': str(submission.author) if submission.author else '[deleted]',
                    'comments': comments
                })

            # Return search results
            return jsonify({
                'search_id': search_id,
                'subreddit': subreddit,
                'query': query,
                'results': search_results,
                'count': len(search_results)
            })

        except Exception as e:
            logging.error(f"Error searching Reddit: {str(e)}")
            return jsonify({'error': f'Failed to search Reddit: {str(e)}'}), 500

    except Exception as e:
        logging.error(f"Error in search endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@llm_analyzer_bp.route('/analyze-sentiment/<search_id>', methods=['POST'])
def analyze_sentiment_by_search_id(search_id):
    """Start sentiment analysis for a search result"""
    try:
        data = request.get_json()

        # Extract analysis parameters
        application_name = data.get('application_name', 'Application')
        filter_type = data.get('filter_type', 'cluster')
        keyword = data.get('keyword', '')
        merge_method = data.get('merge_method', 'deepseek-r1')
        chunk_size = data.get('chunk_size', 40000)
        analysis_model = data.get('analysis_model', 'deepseek-r1')
        max_workers = data.get('max_workers', 3)
        skip_filtering = data.get('skip_filtering', True)
        user_id = data.get('user_id', '123')
        project_id = data.get('project_id')

        # For now, we'll just create a job and return immediately
        # The actual analysis would be done asynchronously
        job_id = generate_job_id()

        # Store the job in the database
        try:
            # Create the job with minimal processing for now
            update_job_status(job_id, 'pending', 'Job created and queued for processing')

            # Return job information
            return jsonify({
                'job_id': job_id,
                'status': 'pending',
                'message': 'Analysis job created successfully'
            })

        except Exception as e:
            logging.error(f"Error creating job: {str(e)}")
            return jsonify({'error': f'Failed to create job: {str(e)}'}), 500

    except Exception as e:
        logging.error(f"Error in analyze-sentiment endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@llm_analyzer_bp.route('/analyze-sentiment', methods=['POST'])
def analyze_pros_cons():
    try:
        data = request.get_json()
        
        # Extract search parameters
        subreddit = data.get('subreddit')
        query = data.get('query')
        limit = data.get('limit', 5)
        sort = data.get('sort', 'relevance')
        time_filter = data.get('time', 'all')
        
        # Validate required search parameters
        if not subreddit or not query:
            return jsonify({'error': 'Missing required parameters: subreddit and query'}), 400
        
        # Extract analysis parameters
        application_name = data.get('application_name', query)
        filter_type = data.get('filter_type', 'cluster')
        keyword = data.get('keyword', query)
        merge_method = data.get('merge_method', 'deepseek-r1')
        chunk_size = data.get('chunk_size', 40000)
        analysis_model = data.get('analysis_model', 'deepseek-r1')
        max_workers = data.get('max_workers', 3)
        skip_filtering = data.get('skip_filtering', True)
        user_id = data.get('user_id', '123')
        project_id = data.get('project_id')  # Get project ID if provided
            
        # Generate a unique job ID
        job_id = generate_job_id()
        
        # Create search parameters object
        search_params = {
            'subreddit': subreddit,
            'query': query,
            'limit': limit,
            'sort': sort,
            'time': time_filter
        }
        
        # Create a job record in database
        db = SessionLocal()
        try:
            # Create JobsRepository instance
            jobs_repo = JobsRepository(db)
            
            # Job parameters to store
            job_parameters = {
                'subreddit': subreddit,
                'query': query,
                'limit': limit,
                'sort': sort,
                'time': time_filter,
                'application_name': application_name,
                'filter_type': filter_type,
                'keyword': keyword,
                'merge_method': merge_method,
                'chunk_size': chunk_size,
                'analysis_model': analysis_model,
                'max_workers': max_workers,
                'project_id': project_id
            }
            
            # Create job in database
            job = jobs_repo.create_job(
                job_id=job_id,
                user_id=user_id,
                project_id=project_id,
                parameters=job_parameters
            )
        except Exception as e:
            logging.error(f"Error creating job in database: {str(e)}")
            return jsonify({'error': f'Failed to create job: {str(e)}'}), 500
        finally:
            db.close()
        
        # Start background thread to process the job
        thread = Thread(
            target=process_sentiment_analysis_job,
            args=(
                job_id, 
                search_params, 
                application_name, 
                filter_type, 
                keyword, 
                merge_method, 
                chunk_size, 
                analysis_model, 
                max_workers, 
                skip_filtering,
                user_id,
                project_id
            )
        )
        thread.daemon = True  # Set as daemon so it doesn't block app shutdown
        thread.start()
        
        # Immediately return the job ID and status
        return jsonify({
            'job_id': job_id,
            'status': 'pending',
            'message': 'Job submitted and queued for processing'
        }), 202  # Return 202 Accepted for async operations
        
    except Exception as e:
        error_msg = f"Error submitting analysis job: {str(e)}"
        error_trace = traceback.format_exc()
        logging.error(f"{error_msg}\n{error_trace}")
        return jsonify({'error': error_msg}), 500

@llm_analyzer_bp.route('/job-status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get the status of a job by its ID"""
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
                
                # Include parameters if they exist
                if job.parameters:
                    response['parameters'] = job.parameters
                
                return jsonify(response)
            
            return jsonify({'error': 'Job not found'}), 404
        finally:
            db.close()
            
    except Exception as e:
        error_msg = f"Error retrieving job status: {str(e)}"
        logging.error(error_msg)
        return jsonify({'error': error_msg}), 500

@llm_analyzer_bp.route('/job/<job_id>', methods=['DELETE'])
def cancel_job(job_id):
    """Cancel a job if it's still pending"""
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
                
    except Exception as e:
        error_msg = f"Error cancelling job: {str(e)}"
        logging.error(error_msg)
        return jsonify({'error': error_msg}), 500

@llm_analyzer_bp.route('/project/<project_id>/cancel', methods=['DELETE'])
def cancel_jobs_by_project(project_id):
    """Cancel all sentiment analysis jobs associated with a project ID"""
    try:
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            
            # Get all jobs for this project that can be cancelled
            jobs_to_cancel = [job for job in jobs_repo.get_jobs_by_project_id(project_id) 
                            if job.status in ["pending", "processing"]]
            
            # Cancel all jobs in the database
            cancelled_count = jobs_repo.cancel_jobs_by_project_id(project_id)
            cancelled_job_ids = [job.id for job in jobs_to_cancel]
            
            return jsonify({
                'project_id': project_id,
                'status': 'cancelled',
                'message': f'{cancelled_count} jobs were cancelled for project {project_id}',
                'cancelled_job_count': cancelled_count,
                'cancelled_job_ids': cancelled_job_ids
            })
            
        finally:
            db.close()
                
    except Exception as e:
        error_msg = f"Error cancelling jobs for project {project_id}: {str(e)}"
        logging.error(error_msg)
        return jsonify({'error': error_msg}), 500

@llm_analyzer_bp.route('/ai-summary/<project_id>', methods=['POST'])
def get_ai_summary_by_project_id(project_id):
    try:
        # Create database session
        db = SessionLocal()
        repo = RedditRepository(db)
        
        # Get the analysis result from the database
        analysis_result = repo.get_analysis_by_id(project_id)
        
        if not analysis_result:
            return jsonify({
                "error": "Analysis not found",
                "message": f"No analysis found with ID: {project_id}"
            }), 404
        
        # Check if summary already exists
        if analysis_result.summary:
            return jsonify(analysis_result.summary)
        
        # If no summary exists, generate one
        analysis_data = analysis_result.data.get('merged_result', {})
        application_name = analysis_result.topic or "Application"
        
        # Get prompt from reddit_prompt.py
        prompt = get_ai_summary_prompt(analysis_data, application_name)
        
        # Log the AI summary prompt
        temp_dir = os.getenv('SENTIMENT_LOG_DIR', '/app/temp')
        with open(os.path.join(temp_dir, f'ai_summary_prompt_{project_id}.txt'), 'w', encoding='utf-8') as f:
            f.write(prompt)
        
        # Call the LLM API
        llm_response = get_claude_completion_with_json(
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Log the AI summary response
        with open(os.path.join(temp_dir, f'ai_summary_response_{project_id}.txt'), 'w', encoding='utf-8') as f:
            f.write(llm_response)
        
        summary_result = None
        try:
            # Parse the JSON response
            summary_result = json.loads(llm_response)
        except Exception as json_err:
            logging.error(f"[get_ai_summary_by_project_id] JSON parsing error: {str(json_err)}")
            logging.error(f"[get_ai_summary_by_project_id] Response snippet: {llm_response[:200]}...")
            # Fallback if JSON parsing fails
            # Calculate totals for fallback
            positive_categories = analysis_data.get('positive', [])
            negative_categories = analysis_data.get('negative', [])
            
            def get_category_total(category):
                return sum([point.get('frequency', 0) for point in category.get('points', [])])
            
            sorted_positive = sorted(positive_categories, key=get_category_total, reverse=True)
            sorted_negative = sorted(negative_categories, key=get_category_total, reverse=True)
            
            top_positive = sorted_positive[0] if sorted_positive else None
            top_negative = sorted_negative[0] if sorted_negative else None
            
            positive_total = sum([
                sum([point.get('frequency', 0) for point in category.get('points', [])])
                for category in positive_categories
            ])
            
            negative_total = sum([
                sum([point.get('frequency', 0) for point in category.get('points', [])])
                for category in negative_categories
            ])
            
            total_mentions = positive_total + negative_total
            positive_percentage = round((positive_total / total_mentions) * 100) if total_mentions > 0 else 0
            
            summary_result = {
                "summary": "Analysis shows " + ("more positive" if positive_percentage > 50 else "more negative") + f" sentiment overall with {positive_percentage}% positive mentions out of {total_mentions} total mentions.",
                "topPositive": f"Users particularly appreciate {top_positive.get('category', 'features')} aspects of the product." if top_positive else "No positive feedback was identified.",
                "topNegative": f"The main concerns relate to {top_negative.get('category', 'issues')} with the product." if top_negative else "No negative feedback was identified.",
                "recommendations": [
                    f"Address issues in the {top_negative.get('category', 'main negative')} category" if top_negative else "Gather more user feedback for analysis",
                    f"Highlight strengths in the {top_positive.get('category', 'main positive')} category" if top_positive else "Focus on improving product features",
                    "Continue monitoring sentiment trends over time"
                ]
            }
        
        # Log the final summary result
        with open(os.path.join(temp_dir, f'ai_summary_result_{project_id}.json'), 'w', encoding='utf-8') as f:
            json.dump(summary_result, f, indent=2)
        
        # Save the summary to the database
        try:
            repo.update_analysis_summary(project_id, summary_result)
            db.commit()
        except Exception as db_err:
            logging.error(f"[get_ai_summary_by_project_id] Error saving summary to database: {str(db_err)}")
            db.rollback()
        
        # Return the summary result
        return jsonify(summary_result)
            
    except Exception as e:
        logging.error(f"[get_ai_summary_by_project_id] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "Failed to generate AI summary",
            "message": str(e)
        }), 500
    finally:
        if 'db' in locals():
            db.close()

@llm_analyzer_bp.route('/ai-summary', methods=['POST'])
def get_ai_summary():
    try:
        # Get analysis data from request
        data = request.json
        analysis_data = data.get('analysisData', {})
        application_name = analysis_data.get('applicationName', '')
        project_id = data.get('projectId', '')
        
        # Get prompt from reddit_prompt.py
        prompt = get_ai_summary_prompt(analysis_data, application_name)
        
        # Log the AI summary prompt
        temp_dir = os.getenv('SENTIMENT_LOG_DIR', '/app/temp')
        with open(os.path.join(temp_dir, 'ai_summary_prompt.txt'), 'w', encoding='utf-8') as f:
            f.write(prompt)
            
        # Call the LLM API
        llm_response = get_claude_completion_with_json(
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Log the AI summary response
        with open(os.path.join(temp_dir, 'ai_summary_response.txt'), 'w', encoding='utf-8') as f:
            f.write(llm_response)
        
        summary_result = None
        try:
            # Parse the JSON response
            summary_result = json.loads(llm_response)
        except:
            # Fallback if JSON parsing fails
            # Calculate totals for fallback
            positive_categories = analysis_data.get('positive', [])
            negative_categories = analysis_data.get('negative', [])
            
            def get_category_total(category):
                return sum([point.get('frequency', 0) for point in category.get('points', [])])
            
            sorted_positive = sorted(positive_categories, key=get_category_total, reverse=True)
            sorted_negative = sorted(negative_categories, key=get_category_total, reverse=True)
            
            top_positive = sorted_positive[0] if sorted_positive else None
            top_negative = sorted_negative[0] if sorted_negative else None
            
            positive_total = sum([
                sum([point.get('frequency', 0) for point in category.get('points', [])])
                for category in positive_categories
            ])
            
            negative_total = sum([
                sum([point.get('frequency', 0) for point in category.get('points', [])])
                for category in negative_categories
            ])
            
            total_mentions = positive_total + negative_total
            positive_percentage = round((positive_total / total_mentions) * 100) if total_mentions > 0 else 0
            
            summary_result = {
                "summary": "Analysis shows " + ("more positive" if positive_percentage > 50 else "more negative") + f" sentiment overall with {positive_percentage}% positive mentions out of {total_mentions} total mentions.",
                "topPositive": f"Users particularly appreciate {top_positive.get('category', 'features')} aspects of the product." if top_positive else "No positive feedback was identified.",
                "topNegative": f"The main concerns relate to {top_negative.get('category', 'issues')} with the product." if top_negative else "No negative feedback was identified.",
                "recommendations": [
                    f"Address issues in the {top_negative.get('category', 'main negative')} category" if top_negative else "Gather more user feedback for analysis",
                    f"Highlight strengths in the {top_positive.get('category', 'main positive')} category" if top_positive else "Focus on improving product features",
                    "Continue monitoring sentiment trends over time"
                ]
            }
        
        # Log the final summary result
        with open(os.path.join(temp_dir, 'ai_summary_result.json'), 'w', encoding='utf-8') as f:
            json.dump(summary_result, f, indent=2)
        
        # Save the summary to the database if we have a project_id
        if project_id:
            try:
                db = SessionLocal()
                repo = RedditRepository(db)
                
                # Since project_id is the same as analysis_id, use it directly
                repo.update_analysis_summary(project_id, summary_result)
                db.commit()
            except Exception as e:
                logging.error(f"[reddit.py] Error saving summary to database: {str(e)}")
                if db:
                    db.rollback()
            finally:
                if db:
                    db.close()
        
        # Return the summary result
        return jsonify(summary_result)
            
    except Exception as e:
        logging.error(f"Error generating AI summary: {str(e)}")
        return jsonify({
            "error": "Failed to generate AI summary",
            "message": str(e)
        }), 500
    

@llm_analyzer_bp.route('/subreddit-stats/<subreddit>', methods=['GET'])
def get_subreddit_stats_endpoint(subreddit):
    """Get statistics about posts and comments for a specific subreddit from the latest analysis result"""
    try:
        stats = get_subreddit_statistics(subreddit)
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@llm_analyzer_bp.route('/posts', methods=['POST'])
def get_posts():
    data = request.get_json()
    post_ids = data.get('post_ids', [])
    
    if not post_ids:
        return jsonify({'error': 'No post IDs provided'}), 400
    
    # Create a database session
    db = SessionLocal()
    try:
        reddit_repo = RedditRepository(db)
        posts = reddit_repo.get_posts_by_ids(post_ids)
        
        # Convert posts to dictionary format
        posts_data = []
        for post in posts:
            post_dict = {
                'id': post.id,
                'title': post.title,
                'text': post.content,
                'author': post.author,
                'created_utc': post.created_utc,
                'score': post.score,
                'permalink': post.permalink,
                'comments': [{
                    'id': comment.id,
                    'body': comment.body,
                    'author': comment.author,
                    'created_utc': comment.created_utc,
                    'score': comment.score
                } for comment in post.comments] if post.comments else []
            }
            posts_data.append(post_dict)
            
        return jsonify({'posts': posts_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

def setup_temp_directory():
    """Create and clean temporary directory for analysis files"""
    temp_dir = os.getenv('SENTIMENT_LOG_DIR', '/app/temp')  # Use '/app/temp' as default if not set
    os.makedirs(temp_dir, exist_ok=True)
    tem_files = glob.glob(os.path.join(temp_dir, '*'))

    for f in tem_files:
        try:
            os.remove(f)
        except Exception as e:
            logging.error(f"[reddit.py] Error deleting file {f}: {str(e)}")

def process_chunk(chunk, chunk_idx, application_name, max_retries=3, method='deepseek-r1'):
    """Process a single data chunk and return the result with retries"""
    for attempt in range(max_retries):
        try:
            # Get pros/cons for this chunk
            if method == 'deepseek-r1':
                prompt = get_reddit_pros_cons_prompt(
                    application_name=application_name,
                    posts_data=json.dumps(chunk, indent=2)[1:-1]  # Remove the outer {} while keeping formatting
                )
            elif method == 'openai-4':
                prompt = openai_get_reddit_pros_cons_prompt(
                    application_name=application_name,
                    posts_data=json.dumps(chunk, indent=2)[1:-1]  # Remove the outer {} while keeping formatting
                )
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Write prompt to file for debugging
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), f'6.{chunk_idx+1}.prompt_log.txt'), 'w', encoding='utf-8') as f:
                f.write(f"Timestamp: {datetime.utcnow().isoformat()}\nPrompt:\n{prompt}")
            
            messages = [{"role": "user", "content": prompt}]
            chunk_result = ""
            
            # Get analysis for this chunk using streaming
            # Use app context for LLM API calls

            if method == 'deepseek-r1':
                for content in get_json_deepseek_completion(messages, stream=True):
                    if content:
                        # Remove print statement that streams to stdout
                        chunk_result += content
            elif method == 'openai-4':
                chunk_result = get_openai_completion(messages,temperature=0.6)
            
            result = process_chunk_result(chunk_result, chunk_idx)
            if result:
                return result
            
        except Exception as e:
            logging.error(f"[reddit.py] Error on attempt {attempt+1}/{max_retries} for chunk {chunk_idx+1}: {str(e)}")
            if attempt == max_retries - 1:  # Last attempt
                logging.error(f"Failed all {max_retries} attempts to process chunk {chunk_idx+1}")
                return None
            continue
    
    return None

def process_chunk_result(chunk_result, chunk_idx):
    """Process and validate chunk result"""
    if not chunk_result:
        return None

    # Save raw chunk result before processing
    raw_chunk_result_file = os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), f'7.{chunk_idx+1}.raw_chunk_result.json')
    with open(raw_chunk_result_file, 'w', encoding='utf-8') as f:
        f.write(chunk_result)

    # Remove the thinking section
    if "<think>" in chunk_result and "</think>" in chunk_result:
        chunk_result = chunk_result.split("</think>")[1].strip()

    # Remove markdown code block formatting
    chunk_result = chunk_result.replace("```json", "").replace("```", "").strip()

    try:
        json_data = json.loads(chunk_result)
        chunk_result = json.dumps(json_data)

        # Save processed chunk result
        chunk_result_file = os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), f'7.{chunk_idx+1}.{chunk_idx+1}.chunk_result.json')
        with open(chunk_result_file, 'w', encoding='utf-8') as f:
            f.write(chunk_result)

        return chunk_result_file
    except json.JSONDecodeError as e:
        logging.error(f"[reddit.py] Error parsing JSON: {str(e)}")
        error_info = {
            "error": str(e),
            "raw_content": chunk_result,
            "timestamp": datetime.utcnow().isoformat()
        }
        with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR', '/app/temp'), f'error_7.{chunk_idx+1}.chunk_result.json'), 'w', encoding='utf-8') as f:
            json.dump(error_info, f, indent=2)
        return None

def merge_and_categorize_results(json_data_list):
    """Merge and categorize the analysis results using iterative merging for large inputs."""
    
    temp_dir = os.getenv('SENTIMENT_LOG_DIR', '/app/temp')
    os.makedirs(temp_dir, exist_ok=True) # Ensure temp dir exists
    
    # --- Iterative Merging ---
    current_data_list = json_data_list
    max_list_items_for_single_llm_call = 5  # Max items to process in one final merge call
    iteration_chunk_size = 6             # Number of items to process per LLM call in each iteration
    iteration_count = 0
    max_iterations = 7  # Set maximum number of iterations

    while len(current_data_list) > max_list_items_for_single_llm_call and iteration_count < max_iterations:
        iteration_count += 1
        iteration_results = []
        
        for i in range(0, len(current_data_list), iteration_chunk_size):
            chunk = current_data_list[i:i + iteration_chunk_size]
            chunk_index = i // iteration_chunk_size
            
            if not chunk: # Skip empty chunks if any
                continue

            # 1. Get mapping for the current chunk
            try:
                merge_prompt = get_point_merger_prompt(chunk)
                # Log prompt for this chunk iteration
                prompt_filename = os.path.join(temp_dir, f'8.iter_{iteration_count}_chunk_{chunk_index+1}_prompt.txt')
                with open(prompt_filename, 'w', encoding='utf-8') as f:
                    f.write(merge_prompt)

                # Use app context for API calls
                mapping_response_chunk = get_claude_completion_with_json(
                    messages=[{"role": "user", "content": merge_prompt}]
                )
                # Log response
                response_filename = os.path.join(temp_dir, f'9.iter_{iteration_count}_chunk_{chunk_index+1}_response.txt')
                with open(response_filename, 'w', encoding='utf-8') as f:
                    f.write(mapping_response_chunk)

            except Exception as e:
                logging.error(f"[reddit.py] Error getting mapping for iteration {iteration_count}, chunk {chunk_index + 1}: {e}")
                # Strategy: If LLM fails for a chunk, maybe append original chunk items to results?
                # For now, let's just log error and skip, resulting in data loss for this chunk.
                # A safer approach might be to add the unmerged 'chunk' data back.
                # Or retry the LLM call. Let's append the original chunk for now to avoid data loss.
                iteration_results.extend(chunk) # Add original items back
                continue

            # 2. Apply mapping to the chunk
            try:
                # merge_points_with_mapping takes List[Dict] and mapping_str, returns Dict
                chunk_merged_data = merge_points_with_mapping(chunk, mapping_response_chunk)
                iteration_results.append(chunk_merged_data) # Append the single merged dict
                # Log merged data for the chunk
                merged_filename = os.path.join(temp_dir, f'9.iter_{iteration_count}_chunk_{chunk_index+1}_merged.json')
                with open(merged_filename, 'w', encoding='utf-8') as f:
                    json.dump(chunk_merged_data, f, indent=2)

            except Exception as e:
                logging.error(f"[reddit.py] Error applying mapping for iteration {iteration_count}, chunk {chunk_index + 1}: {e}")
                # Strategy: If merging fails, append original chunk items?
                iteration_results.extend(chunk) # Add original items back
                continue

        # Update the list for the next iteration
        current_data_list = iteration_results

    # --- Final Merge ---
    if not current_data_list:
         logging.error("[reddit.py] Error: Data list is empty after iterations. Cannot proceed.")
         # Handle this case - maybe return an error structure or raise exception
         # For now, create an empty result structure.
         merged_result = {"positive": [], "negative": []}
    else:
        try:
            final_merge_prompt = get_point_merger_prompt(current_data_list)
            prompt_filename = os.path.join(temp_dir, '8.final_merge_prompt.txt')
            with open(prompt_filename, 'w', encoding='utf-8') as f:
                f.write(final_merge_prompt)

            final_mapping_response = get_claude_completion_with_json(
                messages=[{"role": "user", "content": final_merge_prompt}]
            )
            response_filename = os.path.join(temp_dir, '9.final_mapping_response.txt')
            with open(response_filename, 'w', encoding='utf-8') as f:
                f.write(final_mapping_response)

            merged_result = merge_points_with_mapping(current_data_list, final_mapping_response)
            merged_filename = os.path.join(temp_dir, '9.final_merged_result.json')
            with open(merged_filename, 'w', encoding='utf-8') as f:
                json.dump(merged_result, f, indent=2)

        except Exception as e:
            logging.error(f"[reddit.py] Error during final merge: {e}")
            # Strategy: If final merge fails, try to combine results without final LLM mapping?
            # Combine all points from current_data_list without further mapping as a fallback.
            merged_result = {"positive": [], "negative": []}
            for item_dict in current_data_list:
                 if isinstance(item_dict, dict):
                     merged_result["positive"].extend(item_dict.get("positive", []))
                     merged_result["negative"].extend(item_dict.get("negative", []))
            # Note: This fallback loses the benefit of the final merge consistency check.

    # --- Categorization ---
    try:
        category_prompt = get_category_merger_prompt(merged_result)
        category_prompt_filename = os.path.join(temp_dir, '10.category_merge_prompt.txt')
        with open(category_prompt_filename, 'w', encoding='utf-8') as f:
            f.write(category_prompt)
        
        category_response = get_claude_completion(
            messages=[{"role": "user", "content": category_prompt}]
        )
        category_response_filename = os.path.join(temp_dir, '11.category_response.txt')
        with open(category_response_filename, 'w', encoding='utf-8') as f:
            f.write(category_response)

    except Exception as e:
        logging.error(f"[reddit.py] Error getting category response: {e}")
        # Handle error - maybe return merged_result without categorization?
        # Or raise the exception? Let's raise for now.
        raise ValueError(f"Failed to get categorization from LLM: {e}") from e

    # Process the categorized response
    try:
        # Attempt to find JSON within potential markdown/thinking blocks
        json_match = re.search(r'\{.*\}', category_response, re.DOTALL)
        if not json_match:
             # Fallback: find first '{' and last '}'
             json_start = category_response.find('{')
             json_end = category_response.rfind('}') + 1
             if json_start == -1 or json_end == 0:
                 # If still no JSON, maybe the response is just text? Or malformed?
                 # Try to handle as error or log extensively.
                 logging.error(f"[reddit.py] Could not find JSON structure in category response: {category_response[:500]}...")
                 raise ValueError("Could not find JSON structure in category response")
             json_str = category_response[json_start:json_end]
        else:
             json_str = json_match.group(0)
             
        categorized_result = json.loads(json_str)

    except json.JSONDecodeError as e:
        logging.error(f"[reddit.py] Error parsing categorized result JSON: {e}")
        logging.error(f"[reddit.py] Raw category response snippet: {category_response[:500]}...")
        # Handle error: maybe return merged_result without categorization, or raise
        raise ValueError(f"Failed to parse JSON from category response: {e}") from e
    except Exception as e:
        logging.error(f"[reddit.py] Error processing category response: {e}")
        raise

    # Map categorized points back (with added safety checks)
    final_result = {
        "positive": [],
        "negative": []
    }
    # (rest of the categorization mapping logic remains largely the same)
    # ... [omitting the detailed mapping logic for brevity, assuming it's correct as per previous state] ...
        # Map the categorized points back to their frequency and evidence
    # (Ensure this logic correctly handles the structure from categorized_result)
    for sentiment in ["positive", "negative"]:
         if sentiment not in categorized_result:
              continue
              
         if not isinstance(categorized_result[sentiment], list):
             continue

         for category_group in categorized_result[sentiment]:
            # Check if category_group is a dictionary and has 'category' and 'points'
            if not isinstance(category_group, dict) or "category" not in category_group or "points" not in category_group:
                 continue

            category_name = category_group["category"]
            new_category = {
                "category": category_name,
                "points": []
            }
            
            if not isinstance(category_group["points"], list):
                continue

            for point_data in category_group["points"]:
                # Find the original point data in merged_result
                original_point = None
                # Ensure merged_result[sentiment] exists and is iterable
                if sentiment in merged_result and isinstance(merged_result[sentiment], list):
                    for merged_point in merged_result[sentiment]:
                        # Check if merged_point is a dict and has 'point' key
                        if isinstance(merged_point, dict) and merged_point.get("point") == point_data:
                            original_point = merged_point
                            break
                
                if original_point:
                    # Add space between 'post' and number in evidence keys
                    evidence_with_space = {}
                    original_evidence = original_point.get("evidence", {})
                    if isinstance(original_evidence, dict):
                         evidence_with_space = {
                             f"post {k[4:]}" if isinstance(k, str) and k.startswith('post') and k[4:].isdigit() else k: v 
                             for k, v in original_evidence.items()
                         }
                    else:
                         pass

                    new_category["points"].append({
                        "point": point_data,
                        "frequency": original_point.get("frequency", 1),
                        "evidence": evidence_with_space
                    })
                else:
                     # If point not found in merged_result, add with default values
                     new_category["points"].append({
                        "point": point_data,
                        "frequency": 1,
                        "evidence": {}
                    })
            
            final_result[sentiment].append(new_category)
            
    return final_result

def format_comments(comments, indent_level=0):
    formatted = ""
    indent = "  " * indent_level
    for comment in comments:
        formatted += f"{indent}- {comment['body']}\n"
        if 'replies' in comment and comment['replies']:
            formatted += format_comments(comment['replies'], indent_level + 1)
    return formatted

def merge_points_with_mapping(json_data_list: List[Dict], mapping_str: str) -> Dict:
    try:
        # Remove the thinking section if present
        if "<think>" in mapping_str and "</think>" in mapping_str:
            mapping_str = mapping_str.split("</think>")[1].strip()
        
        # Remove markdown code block formatting if present
        mapping_str = mapping_str.replace("```json", "").replace("```", "").strip()
        
        # Parse the mapping JSON string
        mapping = json.loads(mapping_str)
    except json.JSONDecodeError as e:
        logging.error(f"Error parsing mapping JSON: {str(e)}")
        return {
            "positive": [item for data in json_data_list for item in data.get("positive", [])],
            "negative": [item for data in json_data_list for item in data.get("negative", [])]
        }

    # Initialize merged result structure
    merged_result = {
        "positive": [],
        "negative": []
    }

    # Track processed points to avoid duplicates
    processed_points = set()
    point_groups = {
        "positive": {},
        "negative": {}
    }

    # First pass: Group points by their mapped values
    for data in json_data_list:
        for category in ['positive', 'negative']:
            for item in data.get(category, []):
                original_point = item['point']
                if original_point in mapping[category]:
                    target_point = mapping[category][original_point]
                    
                    if target_point not in point_groups[category]:
                        point_groups[category][target_point] = {
                            'points': [],
                            'total_frequency': 0,
                            'combined_evidence': {}
                        }
                    
                    point_groups[category][target_point]['points'].append(item)
                    point_groups[category][target_point]['total_frequency'] += item['frequency']
                    point_groups[category][target_point]['combined_evidence'].update(item['evidence'])
                else:
                    # Points without mapping go through as-is
                    if original_point not in processed_points:
                        merged_result[category].append(item)
                        processed_points.add(original_point)

    # Second pass: Create merged points from groups
    for category in ['positive', 'negative']:
        for target_point, group in point_groups[category].items():
            merged_point = {
                'point': target_point,
                'frequency': group['total_frequency'],
                'evidence': group['combined_evidence']
            }
            merged_result[category].append(merged_point)

    return merged_result

@llm_analyzer_bp.route('/jobs/user/<user_id>', methods=['GET'])
def get_jobs_by_user(user_id):
    """Get all jobs for a specific user"""
    try:
        limit = request.args.get('limit', 20, type=int)
        
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            jobs = jobs_repo.get_jobs_by_user_id(user_id, limit=limit)
            
            if not jobs:
                return jsonify({'jobs': [], 'count': 0})
            
            # Convert SQLAlchemy objects to dictionaries
            job_list = []
            for job in jobs:
                job_dict = {
                    'job_id': job.id,
                    'analysis_id': job.analysis_id,
                    'status': job.status,
                    'message': job.message,
                    'progress': job.progress,
                    'created_at': job.created_at.isoformat(),
                    'updated_at': job.updated_at.isoformat(),
                    'parameters': job.parameters
                }
                
                # Include subreddit and query from parameters for display
                if job.parameters:
                    if 'subreddit' in job.parameters:
                        job_dict['subreddit'] = job.parameters['subreddit']
                    if 'query' in job.parameters:
                        job_dict['query'] = job.parameters['query']
                    
                job_list.append(job_dict)
            
            return jsonify({
                'jobs': job_list,
                'count': len(job_list)
            })
        finally:
            db.close()
            
    except Exception as e:
        error_msg = f"Error retrieving jobs for user: {str(e)}"
        logging.error(error_msg)
        return jsonify({'error': error_msg}), 500

@llm_analyzer_bp.route('/jobs/analysis/<analysis_id>', methods=['GET'])
def get_jobs_by_analysis(analysis_id):
    """Get all jobs associated with a specific analysis"""
    try:
        db = SessionLocal()
        try:
            jobs_repo = JobsRepository(db)
            jobs = jobs_repo.get_jobs_by_analysis_id(analysis_id)
            
            if not jobs:
                return jsonify({'jobs': [], 'count': 0})
            
            # Convert SQLAlchemy objects to dictionaries
            job_list = []
            for job in jobs:
                job_dict = {
                    'job_id': job.id,
                    'user_id': job.user_id,
                    'status': job.status,
                    'message': job.message,
                    'progress': job.progress,
                    'created_at': job.created_at.isoformat(),
                    'updated_at': job.updated_at.isoformat(),
                    'parameters': job.parameters
                }
                
                # Include subreddit and query from parameters for display
                if job.parameters:
                    if 'subreddit' in job.parameters:
                        job_dict['subreddit'] = job.parameters['subreddit']
                    if 'query' in job.parameters:
                        job_dict['query'] = job.parameters['query']
                    
                job_list.append(job_dict)
            
            return jsonify({
                'jobs': job_list,
                'count': len(job_list)
            })
        finally:
            db.close()
            
    except Exception as e:
        error_msg = f"Error retrieving jobs for analysis: {str(e)}"
        logging.error(error_msg)
        return jsonify({'error': error_msg}), 500