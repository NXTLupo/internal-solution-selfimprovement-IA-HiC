import subprocess

# Create a script that will reset the project in Redux store
script_content = """
import requests
import json

# Define the URLs
job_id = 'a60348ae-d804-4e35-9420-a8c51b52e2ac'
project_id = '83a9f046-9226-484c-be89-eecc75b91718'
base_url = 'http://localhost:8081'

# Helper function to check if a URL is accessible
def check_url(url, description):
    try:
        response = requests.get(url)
        print(f"{description}: {'OK' if response.status_code == 200 else 'Failed'} (Status: {response.status_code})")
        return response.status_code == 200, response
    except Exception as e:
        print(f"{description}: Error - {str(e)}")
        return False, None

# Test basic API endpoints
print("\\n=== Testing API Endpoints ===")
check_url(f"{base_url}/health", "Health check")
check_url(f"{base_url}/api/user/projects/123", "User projects")

# Check job status endpoint
print("\\n=== Checking Job Status ===")
success, job_response = check_url(f"{base_url}/api/topic-model/job-status/{job_id}", f"Job status for {job_id}")

if success:
    job_data = job_response.json()
    print(f"Job status: {job_data.get('status', 'unknown')}")
    print(f"Analysis ID: {job_data.get('analysis_id', 'not set')}")
    
    # Check if the job has parameters with the subreddit
    if 'parameters' in job_data:
        params = job_data['parameters']
        print(f"Subreddit: {params.get('subreddit', 'not set')}")
        print(f"Keyword: {params.get('keyword', 'not set')}")
    else:
        print("No parameters in job data")

# Check if the analysis exists
print("\\n=== Checking Analysis ===")
success, analysis_response = check_url(f"{base_url}/api/topic-model/get-analysis/{job_id}", f"Analysis for {job_id}")

if not success:
    print("Could not fetch analysis, checking if we need to create a view endpoint...")
    
    # Create a simple endpoint to get analysis by ID
    print("\\n=== Creating Temporary Analysis Endpoint ===")
    try:
        # Post to create a temporary endpoint that returns the analysis data
        create_endpoint_response = requests.post(
            f"{base_url}/api/admin/create-temp-endpoint", 
            json={
                "endpoint_path": "temp-get-analysis",
                "analysis_id": job_id
            }
        )
        
        if create_endpoint_response.status_code == 200:
            print("Temporary endpoint created successfully")
            
            # Check if we can now access the analysis
            check_url(f"{base_url}/api/temp-get-analysis", "Temporary analysis endpoint")
        else:
            print(f"Failed to create temporary endpoint: {create_endpoint_response.status_code}")
    except Exception as e:
        print(f"Error creating temporary endpoint: {str(e)}")

# Create a simple project viewer URL for direct viewing
print("\\n=== Direct Project Viewer ===")
project_url = f"http://localhost:3000/topic-modeling?project_id={job_id}&subreddit=parenting"
print(f"Try this direct URL: {project_url}")

print("\\nFinished diagnostics.")
"""

def run_frontend_diagnostics():
    """Run diagnostics on the frontend-backend connection"""
    container_name = 'nxt-humans_ai_cx_workbench-social-research-backend-1'
    
    # Write the script to a temporary file
    with open('temp_frontend_diagnostics.py', 'w') as f:
        f.write(script_content)
    
    # Copy the script to the container
    subprocess.run(['docker', 'cp', 'temp_frontend_diagnostics.py', 
                    f'{container_name}:/tmp/frontend_diagnostics.py'], check=True)
    
    # Run the script in the container
    print("Running frontend diagnostics...")
    result = subprocess.run(['docker', 'exec', container_name, 'python', '/tmp/frontend_diagnostics.py'], 
                          capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Errors:")
        print(result.stderr)
    
    # Clean up
    import os
    os.remove('temp_frontend_diagnostics.py')

if __name__ == "__main__":
    try:
        run_frontend_diagnostics()
        print("\nDiagnostics complete. Please try accessing:")
        print("1. http://localhost:3000/topic-modeling/83a9f046-9226-484c-be89-eecc75b91718")
        print("2. http://localhost:3000/topic-modeling?project_id=a60348ae-d804-4e35-9420-a8c51b52e2ac&subreddit=parenting")
    except Exception as e:
        print(f"An error occurred: {str(e)}")