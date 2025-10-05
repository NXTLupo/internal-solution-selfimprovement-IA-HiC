"""Unified Social Data Collector - Supports Reddit and TrustPilot"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, render_template, request, jsonify, send_from_directory
import threading
import json
import uuid
from datetime import datetime
from fpdf import FPDF
import re
import logging

from models.trustpilot import CollectionJob
from services.collectors import CollectorFactory

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Create required directories
os.makedirs('static', exist_ok=True)
os.makedirs('templates', exist_ok=True)
os.makedirs('downloads', exist_ok=True)

# In-memory job storage (could be replaced with database)
jobs = {}


def clean_text(text):
    """Replace common smart characters or remove unsupported ones"""
    if not isinstance(text, str):
        return ""

    replacements = {
        "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2026": "..."
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Remove any other non-ASCII characters
    text = re.sub(r'[^\x00-\x7F]+', '', text)
    return text


def seconds_to_datetime(seconds):
    """Format timestamp"""
    return datetime.fromtimestamp(int(seconds)).strftime('%Y-%m-%d %H:%M:%S')


def generate_pdf_unified(job: CollectionJob, data: dict):
    """Generate PDF files from collected data (Reddit or TrustPilot)"""

    try:
        batch_size = 100
        files_created = []
        items = data.get('items', [])
        source = data.get('source', 'unknown')

        # Create initial PDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=9)

        # Add header
        header = f"{source.upper()} Data Collection Report\n"
        header += f"Target: {job.target}\n"
        header += f"Collected: {data.get('collected_at', '')}\n"
        header += f"Total Items: {len(items)}\n"
        header += "=" * 50 + "\n\n"

        pdf.multi_cell(0, 10, clean_text(header))

        for idx, item in enumerate(items):
            # Format item based on structure (works for both Reddit and TrustPilot)
            if source == 'reddit':
                content = format_reddit_item(item)
            elif source == 'trustpilot':
                content = format_trustpilot_item(item)
            else:
                content = format_generic_item(item)

            # Add to PDF
            pdf.multi_cell(0, 10, clean_text(content))
            pdf.multi_cell(0, 10, "\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n\n")

            # Update job progress
            job.collected_items = idx + 1
            job.progress = int((idx + 1) / len(items) * 100)
            save_job_status(job)

            # Check if we need to create a new PDF
            if (idx + 1) % batch_size == 0 and (idx + 1) < len(items):
                filename = f"{source}_data_batch_{(idx + 1) // batch_size}.pdf"
                filepath = os.path.join('downloads', f"{job.job_id}_{filename}")
                pdf.output(filepath)
                files_created.append(filename)
                job.files = files_created
                save_job_status(job)

                # Start new PDF
                pdf = FPDF()
                pdf.add_page()
                pdf.set_font("Arial", size=9)

        # Save final PDF
        batch_num = (len(items) - 1) // batch_size + 1
        filename = f"{source}_data_batch_{batch_num}.pdf"
        filepath = os.path.join('downloads', f"{job.job_id}_{filename}")
        pdf.output(filepath)
        files_created.append(filename)

        # Also create JSON export
        json_filename = f"{source}_data_complete.json"
        json_filepath = os.path.join('downloads', f"{job.job_id}_{json_filename}")
        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        files_created.append(json_filename)

        # Update job as completed
        job.status = 'completed'
        job.files = files_created
        job.completed_at = datetime.now()
        job.progress = 100
        save_job_status(job)

    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        job.status = 'error'
        job.error_message = str(e)
        save_job_status(job)


def format_reddit_item(item: dict) -> str:
    """Format Reddit post for PDF"""
    content = f"Post Title: {item.get('title', 'N/A')}\n"
    content += f"Author: {item.get('author', 'Unknown')}\n"
    content += f"Score: {item.get('score', 0)}\n"
    content += f"Comments: {item.get('num_comments', 0)}\n"
    content += f"Posted: {seconds_to_datetime(item.get('created', 0))}\n\n"

    if item.get('selftext'):
        content += f"Post Body:\n{item['selftext']}\n\n"

    if item.get('comments'):
        content += "Top Comments:\n"
        for comment in item['comments']:
            content += f"  - {comment.get('author', 'Unknown')}: {comment.get('body', '')[:200]}...\n"

    return content


def format_trustpilot_item(item: dict) -> str:
    """Format TrustPilot review for PDF (converted to Reddit format)"""
    content = f"Review: {item.get('title', 'N/A')}\n"
    content += f"Author: {item.get('author', 'Unknown')}\n"

    # Extract rating from title (e.g., "5⭐ - Great service")
    rating_match = re.match(r'(\d)⭐', item.get('title', ''))
    if rating_match:
        content += f"Rating: {rating_match.group(1)}/5\n"

    content += f"Helpful Votes: {item.get('score', 0)}\n"

    if item.get('created'):
        content += f"Posted: {seconds_to_datetime(item['created'])}\n\n"

    content += f"Review Body:\n{item.get('selftext', '')}\n"

    if item.get('comments'):
        content += "\nCompany Response:\n"
        for comment in item['comments']:
            content += f"  {comment.get('body', '')}\n"

    return content


def format_generic_item(item: dict) -> str:
    """Generic formatter for unknown data types"""
    return json.dumps(item, indent=2, ensure_ascii=False)


def save_job_status(job: CollectionJob):
    """Save job status to file and memory"""
    jobs[job.job_id] = job

    # Also save to file for persistence
    status_file = os.path.join('downloads', f'{job.job_id}_status.json')
    with open(status_file, 'w') as f:
        json.dump(job.to_dict(), f)


def collect_data_background(job: CollectionJob):
    """Background task to collect data from specified source"""
    try:
        # Create collector
        collector = CollectorFactory.create_collector(job.source)

        # Progress callback
        def update_progress(current, total):
            job.collected_items = current
            job.total_items = total
            job.progress = int((current / total) * 100) if total > 0 else 0
            save_job_status(job)

        # Extract parameters based on source
        params = {}
        if job.source == 'reddit':
            params = {
                'post_count': job.total_items,
                'time_filter': getattr(job, 'time_filter', 'year'),
                'comments_per_post': getattr(job, 'comments_per_post', 5)
            }
        elif job.source == 'trustpilot':
            params = {
                'review_count': job.total_items,
                'sort_by': getattr(job, 'sort_by', 'recency'),
                'min_rating': getattr(job, 'min_rating', 1)
            }
        elif job.source == 'playstore':
            params = {
                'review_count': getattr(job, 'review_count', job.total_items),
                'language': getattr(job, 'language', 'en'),
                'country': getattr(job, 'country', 'us'),
                'sort_by': getattr(job, 'sort_by', 'newest')
            }

        # Collect data
        job.status = 'running'
        save_job_status(job)

        data = collector.collect(
            target=job.target,
            params=params,
            progress_callback=update_progress
        )

        # Generate PDF and JSON outputs
        generate_pdf_unified(job, data)

    except Exception as e:
        logger.error(f"Error in background collection: {str(e)}")
        job.status = 'error'
        job.error_message = str(e)
        save_job_status(job)


# API Routes

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')


@app.route('/api/sources')
def get_sources():
    """Get available data sources and their parameters"""
    sources = []
    for source_name in CollectorFactory.get_supported_sources():
        sources.append({
            'name': source_name,
            'label': source_name.title(),
            'params': CollectorFactory.get_source_params(source_name)
        })
    return jsonify({'sources': sources})


@app.route('/api/collect', methods=['POST'])
def collect():
    """Start a new data collection job"""
    data = request.json

    source = data.get('source')
    target = data.get('target')

    if not source or not target:
        return jsonify({'error': 'Source and target are required'}), 400

    # Validate source
    if source not in CollectorFactory.get_supported_sources():
        return jsonify({'error': f'Invalid source: {source}'}), 400

    # Create job
    job_id = str(uuid.uuid4())
    job = CollectionJob(
        job_id=job_id,
        source=source,
        target=target,
        status='pending',
        total_items=data.get('count', 100)
    )

    # Store additional parameters
    for key, value in data.items():
        if key not in ['source', 'target', 'count']:
            setattr(job, key, value)

    # Save initial job status
    save_job_status(job)

    # Start collection in background thread
    thread = threading.Thread(
        target=collect_data_background,
        args=(job,)
    )
    thread.daemon = True
    thread.start()

    return jsonify({'job_id': job_id, 'status': 'started'})


@app.route('/api/status/<job_id>')
def get_status(job_id):
    """Get status of a collection job"""
    # Try to load from memory first
    job = jobs.get(job_id)

    # If not in memory, try to load from file
    if not job:
        status_file = os.path.join('downloads', f'{job_id}_status.json')
        if os.path.exists(status_file):
            with open(status_file, 'r') as f:
                job_data = json.load(f)
                return jsonify(job_data)
        else:
            return jsonify({'error': 'Job not found'}), 404

    return jsonify(job.to_dict())


@app.route('/api/download/<job_id>/<filename>')
def download(job_id, filename):
    """Download a generated file"""
    return send_from_directory('downloads', f"{job_id}_{filename}", as_attachment=True)


# Legacy Reddit endpoints for backward compatibility

@app.route('/api/scrape', methods=['POST'])
def scrape_reddit_legacy():
    """Legacy endpoint for Reddit scraping"""
    data = request.json

    # Convert to new format for the unified collector
    job_id = str(uuid.uuid4())
    job = CollectionJob(
        job_id=job_id,
        source='reddit',
        target=data.get('subreddit'),
        status='pending',
        total_items=data.get('post_count', 100)
    )

    # Store additional parameters
    job.time_filter = data.get('time_filter', 'year')
    job.comments_per_post = data.get('comments_per_post', 5)

    # Save initial job status
    save_job_status(job)

    # Start collection in background thread
    thread = threading.Thread(
        target=collect_data_background,
        args=(job,)
    )
    thread.daemon = True
    thread.start()

    # Return response in legacy format
    return jsonify({'job_id': job_id})


# Static file serving
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)