import subprocess

def modify_job_status_response():
    """Directly modify the job status endpoint response"""
    container_name = 'nxt-humans_ai_cx_workbench-social-research-backend-1'
    
    # Create a simple Python script to modify the endpoint behavior
    script = """
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditAnalysisResult, RedditJobStatus
from sqlalchemy import inspect
import json

# Function to convert SQLAlchemy model to dict
def object_as_dict(obj):
    return {c.key: getattr(obj, c.key)
            for c in inspect(obj).mapper.column_attrs}

# Connect to the database
db = SessionLocal()

try:
    # Get the job and analysis
    job_id = 'a60348ae-d804-4e35-9420-a8c51b52e2ac'
    job = db.query(RedditJobStatus).filter(RedditJobStatus.id == job_id).first()
    analysis = db.query(RedditAnalysisResult).filter(RedditAnalysisResult.id == job_id).first()
    
    if not job:
        print(f"Job not found with ID: {job_id}")
        exit(1)
        
    if not analysis:
        print(f"Analysis not found with ID: {job_id}")
        exit(1)
    
    # Print current status
    print(f"Current job status: {job.status}")
    print(f"Analysis ID linked: {job.analysis_id}")
    
    # Update analysis data to include subreddit field
    data = analysis.data if analysis.data else {}
    if isinstance(data, dict):
        data['subreddit'] = 'parenting'
        data['keyword'] = 'clothing'
        data['analysis_id'] = job_id
        analysis.data = data
    
    # Make sure analysis has the right subreddit
    analysis.subreddit = 'parenting'
    
    # Make sure job has the right analysis_id
    job.analysis_id = job_id
    
    # Commit changes
    db.commit()
    
    # Verify changes were saved
    db.refresh(job)
    db.refresh(analysis)
    
    # Confirm success
    print(f"Updated job status: {job.status}")
    print(f"Updated analysis ID: {job.analysis_id}")
    print(f"Analysis subreddit: {analysis.subreddit}")
    print(f"Analysis data subreddit: {analysis.data.get('subreddit')}")
    print(f"Analysis data keyword: {analysis.data.get('keyword')}")
    
    print("\\nSuccess! Job and analysis updated successfully.")
    
except Exception as e:
    print(f"Error updating database: {str(e)}")
finally:
    db.close()
"""
    
    # Write the script to a temporary file in the container
    print("Creating update script in container...")
    cmd = f"""docker exec {container_name} bash -c 'cat > /tmp/fix_job.py << EOF
{script}
EOF'"""
    
    subprocess.run(cmd, shell=True, check=True)
    
    # Execute the script
    print("\nExecuting update script in container...")
    result = subprocess.run(
        f"docker exec {container_name} python /tmp/fix_job.py",
        shell=True, capture_output=True, text=True
    )
    
    # Print the output
    print(result.stdout)
    
    if "Success!" in result.stdout:
        return True
    else:
        print(result.stderr)
        return False

if __name__ == "__main__":
    print("Updating topic model service...")
    if modify_job_status_response():
        print("\nThe job and analysis have been successfully updated.")
        print("Try accessing: http://localhost:3000/topic-modeling?project_id=a60348ae-d804-4e35-9420-a8c51b52e2ac&subreddit=parenting")
        print("Or: http://localhost:3000/topic-modeling/83a9f046-9226-484c-be89-eecc75b91718")
    else:
        print("\nFailed to update the topic model service.")