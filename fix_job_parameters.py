import subprocess

# Create a script to update the job parameters
script_content = """
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditAnalysisResult, RedditJobStatus
import json

# Connect to the database
db = SessionLocal()

try:
    # Get the job and analysis
    job_id = 'a60348ae-d804-4e35-9420-a8c51b52e2ac'
    job = db.query(RedditJobStatus).filter_by(id=job_id).first()
    
    if not job:
        print('Job not found')
        exit(1)
    
    # Update job parameters
    job.parameters = {
        'subreddit': 'parenting',
        'keyword': 'clothing',
        'project_id': '83a9f046-9226-484c-be89-eecc75b91718',
        'num_posts': 800,
        'max_comments_per_post': 3,
        'index_in_pgvector': True,
        'sort': 'hot'
    }
    
    # Make sure the analysis_id is linked correctly
    job.analysis_id = job_id
    
    # Commit changes
    db.commit()
    db.refresh(job)
    
    print('Job parameters updated successfully:')
    print(json.dumps(job.parameters, indent=2))
    print(f'Analysis ID: {job.analysis_id}')
    
except Exception as e:
    print(f'Error: {str(e)}')
finally:
    db.close()
"""

def update_job_parameters():
    """Updates job parameters in the database"""
    container_name = 'nxt-humans_ai_cx_workbench-social-research-backend-1'
    
    # Write the script to a temporary file
    with open('temp_update_job.py', 'w') as f:
        f.write(script_content)
    
    # Copy the script to the container
    subprocess.run(['docker', 'cp', 'temp_update_job.py', f'{container_name}:/tmp/update_job.py'], check=True)
    
    # Run the script in the container
    print("Updating job parameters...")
    result = subprocess.run(['docker', 'exec', '-w', '/app/backend', container_name, 'python', '/tmp/update_job.py'], 
                          capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Errors:")
        print(result.stderr)
    
    # Clean up
    import os
    os.remove('temp_update_job.py')

if __name__ == "__main__":
    try:
        update_job_parameters()
        print("\nJob parameters have been updated.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")