import os
import praw
from fpdf import FPDF
from datetime import datetime
import re
import uuid
from flask import Flask, render_template, request, redirect, url_for, jsonify, send_from_directory
import threading
import json

app = Flask(__name__)

# Create required directories
os.makedirs('static', exist_ok=True)
os.makedirs('templates', exist_ok=True)
os.makedirs('downloads', exist_ok=True)

# Helper functions
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

# Initialize the Reddit instance with praw
def get_reddit_instance():
    user_agent_string = "web:social_research_posts:v0.0.1 (by u/mike_nxt_humans)"
    reddit = praw.Reddit(
        client_id="REDACTED",
        client_secret="REDACTED",
        user_agent=user_agent_string,
        check_for_async=False,
        ratelimit_seconds=10
    )
    return reddit

# Function to generate a PDF
def generate_pdf(job_id, subreddit, post_count, time_filter, comments_per_post):
    """Generate PDF files based on Reddit data"""
    reddit = get_reddit_instance()
    
    # Create job status file
    status_file = os.path.join('downloads', f'{job_id}_status.json')
    with open(status_file, 'w') as f:
        json.dump({
            'status': 'running',
            'progress': 0,
            'total': post_count,
            'files': []
        }, f)
    
    try:
        # Get submissions
        if time_filter == 'all':
            submissions = reddit.subreddit(subreddit).top(limit=post_count)
        else:
            submissions = reddit.subreddit(subreddit).top(limit=post_count, time_filter=time_filter)
        
        posts_count = 0
        batch_size = 100
        files_created = []
        
        # Create a PDF instance for each batch
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=9)
        
        # Write the posts and comments to multiple PDFs
        for submission in submissions:
            # Write the post details
            post_title = f"Post Title: {clean_text(submission.title)}\n"
            self_text = f"Post Body: {clean_text(submission.selftext)}\n"
            score = f"Score: {submission.score}\n"
            comments_count = f"Number of Comments: {submission.num_comments}\n"
            post_created = f"Posted on: {seconds_to_datetime(submission.created)}\n\n"
            comments_intro = "Comments (Best):\n"
        
            # Add post details to the PDF
            pdf.multi_cell(0, 10, clean_text(post_title))
            pdf.multi_cell(0, 10, clean_text(self_text))
            pdf.multi_cell(0, 10, score)
            pdf.multi_cell(0, 10, comments_count)
            pdf.multi_cell(0, 10, post_created)
            pdf.multi_cell(0, 10, comments_intro)
        
            # Write the comments
            submission.comment_sort = "top"
            submission.comments.replace_more(limit=0)
            all_comments = submission.comments.list()
            first_n_comments = all_comments[:comments_per_post]
            for comment in first_n_comments:
                if hasattr(comment, 'author') and comment.author:
                    author = comment.author.name
                    body = comment.body
                    body = clean_text(body)
                    comment_body = f"Comment by {author}: {body}\n"
                    pdf.multi_cell(0, 10, comment_body)
        
            # Add a separator between posts
            pdf.multi_cell(0, 10, "\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n\n")
        
            # Increment the post counter
            posts_count += 1
            
            # Update progress
            with open(status_file, 'r') as f:
                status_data = json.load(f)
            
            status_data['progress'] = posts_count
            
            with open(status_file, 'w') as f:
                json.dump(status_data, f)
        
            # If batch size posts have been processed, save the current PDF and start a new one
            if posts_count % batch_size == 0:
                filename = f"reddit_posts_and_comments_{posts_count}.pdf"
                filepath = os.path.join('downloads', f"{job_id}_{filename}")
                pdf.output(filepath)
                files_created.append(filename)
                
                # Update files list
                with open(status_file, 'r') as f:
                    status_data = json.load(f)
                
                status_data['files'] = files_created
                
                with open(status_file, 'w') as f:
                    json.dump(status_data, f)
                
                pdf = FPDF()  # Create a new PDF instance for the next batch
                pdf.add_page()
                pdf.set_font("Arial", size=9)
        
        # After loop ends, if there are remaining posts, save the final PDF
        if posts_count % batch_size != 0:
            filename = f"reddit_posts_and_comments_{posts_count}.pdf"
            filepath = os.path.join('downloads', f"{job_id}_{filename}")
            pdf.output(filepath)
            files_created.append(filename)
        
        # Update status to completed
        with open(status_file, 'r') as f:
            status_data = json.load(f)
        
        status_data['status'] = 'completed'
        status_data['files'] = files_created
        
        with open(status_file, 'w') as f:
            json.dump(status_data, f)
            
    except Exception as e:
        # Update status to error
        with open(status_file, 'r') as f:
            status_data = json.load(f)
        
        status_data['status'] = 'error'
        status_data['error'] = str(e)
        
        with open(status_file, 'w') as f:
            json.dump(status_data, f)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scrape', methods=['POST'])
def scrape():
    data = request.json
    subreddit = data.get('subreddit', '')
    post_count = int(data.get('post_count', 100))
    time_filter = data.get('time_filter', 'year')
    comments_per_post = int(data.get('comments_per_post', 5))
    
    if not subreddit:
        return jsonify({'error': 'Subreddit name is required'}), 400
    
    job_id = str(uuid.uuid4())
    
    # Start the scraping in a background thread
    thread = threading.Thread(
        target=generate_pdf,
        args=(job_id, subreddit, post_count, time_filter, comments_per_post)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({'job_id': job_id})

@app.route('/api/status/<job_id>')
def status(job_id):
    status_file = os.path.join('downloads', f'{job_id}_status.json')
    
    if not os.path.exists(status_file):
        return jsonify({'error': 'Job not found'}), 404
    
    with open(status_file, 'r') as f:
        status_data = json.load(f)
    
    return jsonify(status_data)

@app.route('/api/download/<job_id>/<filename>')
def download(job_id, filename):
    return send_from_directory('downloads', f"{job_id}_{filename}", as_attachment=True)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)