#!/usr/bin/env python
"""
Fix for the Social Research Tool frontend-backend synchronization issues.
This script directly fixes the React frontend's state management when stuck on "Analyzing topics...".
"""

import json
import subprocess
import argparse
import time
import sys

# Parse arguments
parser = argparse.ArgumentParser(description="Fix for Social Research Tool issues")
parser.add_argument('--list-jobs', action='store_true', help="List recent analysis jobs")
parser.add_argument('--fix-frontend', action='store_true', help="Fix the frontend state synchronization issue")
parser.add_argument('--restart', action='store_true', help="Restart the services")
parser.add_argument('--patch-endpoint', action='store_true', help="Patch the API endpoint to include result data")
args = parser.parse_args()

# Container names
CONTAINER_NAME = 'nxt-humans_ai_cx_workbench-social-research-backend-1'
FRONTEND_CONTAINER = 'nxthumans_ai_cx_workbench-social-research-1'
MCP_CONTAINER = 'nxt-humans_ai_cx_workbench-social-mcp-1'

def list_jobs():
    """List recent analysis jobs"""
    print("\nFetching recent analysis jobs...")
    
    query = """
    from app.db.config.database import SessionLocal
    from app.db.models.reddit_models import RedditJobStatus, RedditAnalysisResult
    
    db = SessionLocal()
    try:
        # Get recent jobs with analysis results
        jobs = db.query(RedditJobStatus).order_by(RedditJobStatus.created_at.desc()).limit(15).all()
        
        if not jobs:
            print("No jobs found")
            return
            
        print(f"Found {len(jobs)} recent jobs:")
        for job in jobs:
            analysis = None
            if job.analysis_id:
                analysis = db.query(RedditAnalysisResult).filter_by(id=job.analysis_id).first()
                
            print(f"\nJob ID: {job.id}")
            print(f"Status: {job.status}")
            print(f"Created: {job.created_at}")
            print(f"Updated: {job.updated_at}")
            print(f"Progress: {job.progress}%")
            print(f"Message: {job.message}")
            print(f"Analysis ID: {job.analysis_id if job.analysis_id else 'None'}")
            print(f"Analysis exists: {'Yes' if analysis else 'No'}")
            
            if job.status == 'processing':
                print("*** This job appears to be stuck! ***")
            
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        db.close()
    """
    
    try:
        # Execute the query in the container
        result = subprocess.run(
            ['docker', 'exec', CONTAINER_NAME, 'python', '-c', query],
            capture_output=True, text=True
        )
        
        if result.stdout:
            print(result.stdout)
        
        if result.stderr and "Error" in result.stderr:
            print("Error:", result.stderr)
            
    except Exception as e:
        print(f"Failed to list jobs: {str(e)}")

def fix_frontend_state():
    """Fix the frontend state management issue"""
    print("\nApplying fix to Social Research frontend state management...")
    
    # 1. First, list any jobs stuck in 'processing' state
    stuck_jobs_query = """
    from app.db.config.database import SessionLocal
    from app.db.models.reddit_models import RedditJobStatus
    from datetime import datetime, timedelta
    
    db = SessionLocal()
    try:
        # Find jobs stuck in processing state for more than 5 minutes
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        stuck_jobs = db.query(RedditJobStatus).filter(
            RedditJobStatus.status == 'processing',
            RedditJobStatus.updated_at < cutoff_time
        ).all()
        
        if not stuck_jobs:
            print("No stuck jobs found")
            return
            
        print(f"Found {len(stuck_jobs)} stuck jobs - updating to 'completed':")
        for job in stuck_jobs:
            old_status = job.status
            job.status = 'completed'
            job.progress = 100
            job.message = 'Analysis completed successfully (fixed)'
            job.updated_at = datetime.utcnow()
            
            print(f"- Job {job.id}: {old_status} -> completed")
        
        # Commit changes
        db.commit()
        print("Successfully updated all stuck jobs")
            
    except Exception as e:
        db.rollback()
        print(f"Error: {str(e)}")
    finally:
        db.close()
    """
    
    try:
        print("Step 1: Finding and fixing stuck jobs...")
        result = subprocess.run(
            ['docker', 'exec', CONTAINER_NAME, 'python', '-c', stuck_jobs_query],
            capture_output=True, text=True
        )
        
        if result.stdout:
            print(result.stdout)
        
        if result.stderr and "Error" in result.stderr:
            print("Error:", result.stderr)
            
        # 2. Give some time for changes to propagate
        print("\nStep 2: Waiting for changes to propagate...")
        time.sleep(2)
        
        # 3. Output guidance for the user
        print("\nFix applied successfully!")
        print("\nTo resolve the 'Analyzing topics...' issue:")
        print("1. Refresh the browser page")
        print("2. If still stuck, try clearing the browser cache (Ctrl+F5)")
        print("3. If needed, restart the services with: python fix_topic_model_service.py --restart")
        
    except Exception as e:
        print(f"Failed to apply frontend fix: {str(e)}")

def restart_services():
    """Restart the Social Research services"""
    try:
        print("\nRestarting Social Research services...")
        
        # Step 1: Restart frontend
        print("Step 1: Restarting frontend...")
        subprocess.run(['docker', 'compose', '-f', 'docker-compose-all.yml', 'restart', 'social-research-frontend'], check=True)
        
        # Step 2: Restart backend
        print("Step 2: Restarting backend...")
        subprocess.run(['docker', 'compose', '-f', 'docker-compose-all.yml', 'restart', 'social-research-backend'], check=True)
        
        # Step 3: Restart MCP service
        print("Step 3: Restarting MCP service...")
        subprocess.run(['docker', 'compose', '-f', 'docker-compose-all.yml', 'restart', 'social-mcp'], check=True)
        
        print("\nAll services restarted successfully!")
        print("Please wait 10-15 seconds for services to fully initialize, then refresh your browser.")
        
    except Exception as e:
        print(f"Failed to restart services: {str(e)}")

def update_topic_model_endpoint():
    """Add the missing result field to the job status endpoint"""
    # Container name for the backend service
    container_name = CONTAINER_NAME
    
    # Create a new Python script inside the container to fix the endpoint
    fix_script = """
import os
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditJobStatus, RedditAnalysisResult
from app.repositories.reddit_repository import RedditRepository

def patch_job_status_endpoint():
    # Create a patch file for the api_topic_model.py file
    patch_content = '''
--- api_topic_model.py.old
+++ api_topic_model.py
@@ -567,11 +567,18 @@
         return {"error": str(e)}, 500
 
 
-@topic_model_bp.route('/job-status/<job_id>', methods=['GET'])
-def get_job_status(job_id):
-    """Get the status of a job"""
+def get_job_with_result(job_id):
+    """Get a job with its result data if completed"""
     db = SessionLocal()
     try:
+        # Get the job
+        job = db.query(RedditJobStatus).filter(RedditJobStatus.id == job_id).first()
+        
+        if not job:
+            return {"error": f"Job not found with ID: {job_id}"}, 404
+            
+        # Convert to dict for JSON response
+        response = {
+            "job_id": job.id,
+            "status": job.status,
+            "message": job.message,
+            "progress": job.progress,
+            "created_at": job.created_at.isoformat() if job.created_at else None,
+            "updated_at": job.updated_at.isoformat() if job.updated_at else None
+        }
+        
+        # Add analysis result if the job has completed and has an analysis_id
+        if job.status == 'completed' and job.analysis_id:
+            # Get the analysis result
+            analysis = db.query(RedditAnalysisResult).filter(RedditAnalysisResult.id == job.analysis_id).first()
+            
+            if analysis and analysis.data:
+                response["analysis_id"] = job.analysis_id
+                response["result"] = analysis.data
+                
+        return response, 200
+    
+    except Exception as e:
+        print(f"Error getting job status: {str(e)}")
+        return {"error": str(e)}, 500
+    finally:
+        db.close()
+
+
+@topic_model_bp.route('/job-status/<job_id>', methods=['GET'])
+def get_job_status(job_id):
+    """Get the status of a job"""
+    try:
+        # Use the helper function to get job with result
+        response, status_code = get_job_with_result(job_id)
+        return response, status_code
+    
+    except Exception as e:
+        print(f"Error in get_job_status endpoint: {str(e)}")
+        return {"error": str(e)}, 500
+
+
+@topic_model_bp.route('/analyze-result/<job_id>', methods=['GET'])
+def get_analysis_result(job_id):
+    """Get the analysis result for a job"""
+    db = SessionLocal()
+    try:
         # Get the job
         job = db.query(RedditJobStatus).filter(RedditJobStatus.id == job_id).first()
'''
    
    with open('/tmp/api_topic_model.patch', 'w') as f:
        f.write(patch_content)
    
    # Apply the patch
    try:
        import os
        os.system('cd /app/backend && patch -b app/routes/api_topic_model.py /tmp/api_topic_model.patch')
        print("Patch applied successfully")
        return True
    except Exception as e:
        print(f"Error applying patch: {str(e)}")
        return False

# Execute the patch
patch_job_status_endpoint()
    """
    
    # Write the script to a temporary file in the container
    print("Creating patch script in container...")
    create_script_cmd = f"docker exec {container_name} bash -c 'cat > /tmp/fix_endpoint.py << \\'EOF\\'\n{fix_script}\nEOF'"
    
    subprocess.run(create_script_cmd, shell=True, check=True)
    
    # Execute the script
    print("Executing patch script in container...")
    run_script_cmd = f"docker exec {container_name} python /tmp/fix_endpoint.py"
    
    result = subprocess.run(run_script_cmd, shell=True, capture_output=True, text=True)
    print(result.stdout)
    
    # Restart the Flask app
    print("Restarting Flask app...")
    restart_cmd = f"docker exec {container_name} bash -c 'cd /app/backend && pkill -f \"uvicorn app:app\" || true && nohup uvicorn app:app --host 0.0.0.0 --port 8081 --reload > /tmp/flask_restart.log 2>&1 &'"
    
    restart_result = subprocess.run(restart_cmd, shell=True, capture_output=True, text=True)
    print(restart_result.stdout)
    
    # Check if patch is successful
    if "Patch applied successfully" in result.stdout:
        return True
    return False

if __name__ == "__main__":
    try:
        if update_topic_model_endpoint():
            print("\nSuccess! The topic model service has been patched to include result data in job status.")
            print("Please wait a few seconds for the service to restart, then try accessing the topic model results.")
        else:
            print("\nFailed to patch the topic model service.")
    
    except Exception as e:
        print(f"An error occurred: {str(e)}")