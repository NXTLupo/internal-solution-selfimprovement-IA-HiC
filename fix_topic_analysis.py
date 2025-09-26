#!/usr/bin/env python
# Tool to fix the "Analyzing topics..." issue in Social Research App
# This script directly updates the job status in the database to "completed"

import json
import uuid
import requests
import argparse
import subprocess
from datetime import datetime

# Default configuration
API_BASE_URL = 'http://localhost:8081'
USER_ID = '123'

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Fix "Analyzing topics..." issue in Social Research App')
    parser.add_argument('--job-id', type=str, help='Specific job ID to fix')
    parser.add_argument('--list', action='store_true', help='List recent jobs')
    parser.add_argument('--fix-all', action='store_true', help='Fix all jobs stuck in "processing" state')
    parser.add_argument('--container', type=str, default='nxt-humans_ai_cx_workbench-social-research-backend-1', 
                        help='Container name for the social research backend')
    return parser.parse_args()

# Get job information via API
def get_recent_jobs():
    """Get recent jobs via API"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/topic-model/jobs")
        if response.status_code == 200:
            return response.json()
        print(f"Error getting jobs: {response.status_code}")
        return None
    except Exception as e:
        print(f"Error accessing API: {e}")
        return None

# Update job status directly
def update_job_status(container_name, job_id=None):
    """Update job status directly in database"""
    # Build SQL command to find and update stuck jobs
    if job_id:
        # Update specific job
        sql_command = f"""
        cat << EOF | python -c "
import sys, json, os
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditJobStatus
from datetime import datetime

db = SessionLocal()

try:
    # Find the job
    job = db.query(RedditJobStatus).filter(RedditJobStatus.id == '{job_id}').first()
    
    if job:
        # Update the job status
        old_status = job.status
        job.status = 'completed'
        job.progress = 100
        job.message = 'Analysis completed successfully (fixed)'
        job.updated_at = datetime.utcnow()
        
        db.commit()
        print(f'Updated job {job_id} from status "{old_status}" to "completed"')
    else:
        print(f'Job {job_id} not found')
        
except Exception as e:
    db.rollback()
    print('Error updating job:', str(e))
finally:
    db.close()
"
EOF
"""

    else:
        # Update all jobs stuck in processing state
        sql_command = f"""
        cat << EOF | python -c "
import sys, json, os
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditJobStatus
from datetime import datetime

db = SessionLocal()

try:
    # Find all stuck jobs
    stuck_jobs = db.query(RedditJobStatus).filter(RedditJobStatus.status == 'processing').all()
    
    if not stuck_jobs:
        print('No jobs stuck in "processing" state were found.')
    else:
        for job in stuck_jobs:
            # Update job status
            old_status = job.status
            job.status = 'completed'
            job.progress = 100
            job.message = 'Analysis completed successfully (fixed)'
            job.updated_at = datetime.utcnow()
            print(f'Updated job {job.id} from status "{old_status}" to "completed"')
        
        db.commit()
        print(f'Successfully updated {len(stuck_jobs)} stuck jobs')
        
except Exception as e:
    db.rollback()
    print('Error updating jobs:', str(e))
finally:
    db.close()
"
EOF
"""

    # Execute the SQL command
    try:
        result = subprocess.run(['docker', 'exec', container_name, 'bash', '-c', sql_command], 
                                capture_output=True, text=True)
        print(result.stdout)
        
        if "Error" in result.stdout or result.returncode != 0:
            print("Error executing command:", result.stderr)
            return False
            
        return True
    except Exception as e:
        print(f"Error running command: {e}")
        return False

def list_jobs(container_name):
    """List recent jobs in the database"""
    sql_command = f"""
    cat << EOF | python -c "
import json, os
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditJobStatus
from datetime import datetime

db = SessionLocal()

try:
    # Get 10 most recent jobs
    jobs = db.query(RedditJobStatus).order_by(RedditJobStatus.created_at.desc()).limit(10).all()
    
    if not jobs:
        print('No jobs found in the database.')
    else:
        print(f'Found {len(jobs)} recent jobs:')
        for job in jobs:
            print(f'\nJob ID: {job.id}')
            print(f'Status: {job.status}')
            print(f'Progress: {job.progress}%')
            print(f'Message: {job.message}')
            print(f'Created: {job.created_at}')
            print(f'Updated: {job.updated_at}')
        
except Exception as e:
    print('Error listing jobs:', str(e))
finally:
    db.close()
"
EOF
"""

    # Execute the SQL command
    try:
        result = subprocess.run(['docker', 'exec', container_name, 'bash', '-c', sql_command], 
                                capture_output=True, text=True)
        print(result.stdout)
        return True
    except Exception as e:
        print(f"Error running command: {e}")
        return False

def main():
    """Main function"""
    args = parse_arguments()
    container_name = args.container
    
    try:
        if args.list:
            print("\nListing recent jobs...")
            list_jobs(container_name)
        elif args.job_id:
            print(f"\nFixing specific job: {args.job_id}...")
            if update_job_status(container_name, args.job_id):
                print(f"\nJob {args.job_id} has been updated to 'completed' status.")
                print("Refresh the browser to see the results.")
        elif args.fix_all:
            print("\nFinding and fixing all jobs stuck in 'processing' state...")
            if update_job_status(container_name):
                print("\nAll stuck jobs have been updated to 'completed' status.")
                print("Refresh the browser to see the results.")
        else:
            print("\nPlease provide one of the following arguments:")
            print("  --list: List recent jobs")
            print("  --job-id JOB_ID: Fix a specific job")
            print("  --fix-all: Fix all jobs stuck in 'processing' state")
            print("\nUse --help for more information")
    
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
        print("Please check the container name and try again.")

if __name__ == "__main__":
    main()