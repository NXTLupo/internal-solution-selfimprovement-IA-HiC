import json
import uuid
from datetime import datetime

# Configuration
JOB_ID = 'a60348ae-d804-4e35-9420-a8c51b52e2ac'
PROJECT_ID = '83a9f046-9226-484c-be89-eecc75b91718'
USER_ID = '123'
API_BASE_URL = 'http://localhost:8081'

def update_analysis_data(container_name):
    """Update the analysis data with the subreddit information"""
    import subprocess
    
    # SQL to update the analysis data
    sql_update_analysis = f"""
    cat << EOF | python -c "
import sys, json, os
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditAnalysisResult, RedditJobStatus
from datetime import datetime

db = SessionLocal()

try:
    # Get the analysis
    analysis = db.query(RedditAnalysisResult).filter_by(id='{JOB_ID}').first()
    
    if not analysis:
        print('Analysis not found with ID:', '{JOB_ID}')
        sys.exit(1)
    
    # Get the data and ensure it's a dict if it's not
    data = analysis.data if isinstance(analysis.data, dict) else {{}}
    
    # Add the subreddit field explicitly
    data['subreddit'] = 'parenting'
    analysis.data = data
    
    # Also update the project record in the job
    job = db.query(RedditJobStatus).filter_by(id='{JOB_ID}').first()
    if job and job.parameters:
        params = job.parameters
        params['project_id'] = '{PROJECT_ID}'
        job.parameters = params
    
    # Commit both changes
    db.commit()
    
    # Verify changes
    analysis_refreshed = db.query(RedditAnalysisResult).filter_by(id='{JOB_ID}').first()
    print('Updated analysis data subreddit:', analysis_refreshed.data.get('subreddit', None))
    
except Exception as e:
    db.rollback()
    print('Error updating analysis data:', str(e))
finally:
    db.close()
"
EOF
"""

    # Execute the update
    print("Updating analysis data...")
    result = subprocess.run(['docker', 'exec', container_name, 'bash', '-c', sql_update_analysis], 
                            capture_output=True, text=True)
    print(result.stdout)
    
    if "Error" in result.stdout or result.returncode != 0:
        print("Error updating analysis data:", result.stderr)
        return False
        
    return True

if __name__ == "__main__":
    container_name = 'nxt-humans_ai_cx_workbench-social-research-backend-1'
    
    try:
        print("Attempting to update analysis data...")
        if update_analysis_data(container_name):
            print("\nSuccess! The topic analysis data has been updated.")
            print(f"You can now view the results at: http://localhost:3000/topic-modeling/{PROJECT_ID}")
            print(f"Also try direct job URL: http://localhost:3000/topic-modeling?project_id={JOB_ID}&subreddit=parenting")
        else:
            print("\nFailed to update analysis data.")
    
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print("Please check the container name and try again.")