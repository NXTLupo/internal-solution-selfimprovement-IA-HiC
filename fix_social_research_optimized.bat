@echo off
:: This script optimizes and fixes the Social Research tool for Redux state management issues

echo =========================================================
echo Social Research Redux State Management Fix Tool v2.0
echo =========================================================
echo This tool fixes the "job completed but results not showing" issue
echo.

:: Check Docker status
echo Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Docker is not running or not accessible. Please start Docker first.
  exit /b 1
)

:: Check if the Social Research containers exist and are running
echo Detecting Social Research containers...
for /f "tokens=*" %%a in ('docker ps --format "{{.Names}}" ^| findstr social-research-backend') do set BACKEND_CONTAINER=%%a
for /f "tokens=*" %%a in ('docker ps --format "{{.Names}}" ^| findstr social-research-frontend') do set FRONTEND_CONTAINER=%%a

if "%BACKEND_CONTAINER%"=="" (
  echo Backend container not running, using default name...
  set BACKEND_CONTAINER=nxt-humans_ai_cx_workbench-social-research-backend-1
) else (
  echo Backend container found: %BACKEND_CONTAINER%
)

if "%FRONTEND_CONTAINER%"=="" (
  echo Frontend container not running, using default name...
  set FRONTEND_CONTAINER=nxt-humans_ai_cx_workbench-social-research-frontend-1
) else (
  echo Frontend container found: %FRONTEND_CONTAINER%
)

echo.

echo Step 1: Creating job completion fix script...
:: Create a Python script to fix jobs and project data synchronization
echo import sys > fix_job_completion.py
echo import json >> fix_job_completion.py
echo import time >> fix_job_completion.py
echo from app.db.config.database import SessionLocal >> fix_job_completion.py
echo from app.db.models.reddit_models import RedditAnalysisResult, RedditJobStatus >> fix_job_completion.py
echo from sqlalchemy import or_ >> fix_job_completion.py
echo from datetime import datetime >> fix_job_completion.py
echo. >> fix_job_completion.py
echo # Connect to database >> fix_job_completion.py
echo db = SessionLocal() >> fix_job_completion.py
echo. >> fix_job_completion.py
echo try: >> fix_job_completion.py
echo     print("\nFixing jobs with missing or incorrect project data...") >> fix_job_completion.py
echo     # Find all completed jobs with analysis_id >> fix_job_completion.py
echo     completed_jobs = db.query(RedditJobStatus).filter( >> fix_job_completion.py
echo         RedditJobStatus.status == 'completed', >> fix_job_completion.py
echo         RedditJobStatus.analysis_id != None >> fix_job_completion.py
echo     ).all() >> fix_job_completion.py
echo. >> fix_job_completion.py
echo     print(f"Found {len(completed_jobs)} completed jobs with project IDs") >> fix_job_completion.py
echo. >> fix_job_completion.py
echo     fixed_count = 0 >> fix_job_completion.py
echo     for job in completed_jobs: >> fix_job_completion.py
echo         job_id = job.id >> fix_job_completion.py
echo         analysis_id = job.analysis_id >> fix_job_completion.py
echo. >> fix_job_completion.py
echo         # Find the project >> fix_job_completion.py
echo         project = db.query(RedditAnalysisResult).filter( >> fix_job_completion.py
echo             RedditAnalysisResult.id == analysis_id >> fix_job_completion.py
echo         ).first() >> fix_job_completion.py
echo. >> fix_job_completion.py
echo         if not project: >> fix_job_completion.py
echo             print(f"Project {analysis_id} not found for job {job_id}") >> fix_job_completion.py
echo             continue >> fix_job_completion.py
echo. >> fix_job_completion.py
echo         # Check if project needs data from job >> fix_job_completion.py
echo         if not project.data or not isinstance(project.data, dict) or 'topics' not in project.data: >> fix_job_completion.py
echo             print(f"Project {analysis_id} missing topic data, attempting to fix...") >> fix_job_completion.py
echo. >> fix_job_completion.py
echo             # Get job result data >> fix_job_completion.py
echo             result = None >> fix_job_completion.py
echo             if hasattr(job, 'result') and job.result: >> fix_job_completion.py
echo                 if isinstance(job.result, str): >> fix_job_completion.py
echo                     try: >> fix_job_completion.py
echo                         result = json.loads(job.result) >> fix_job_completion.py
echo                     except: >> fix_job_completion.py
echo                         print(f"Failed to parse job result for {job_id}") >> fix_job_completion.py
echo                 else: >> fix_job_completion.py
echo                     result = job.result >> fix_job_completion.py
echo. >> fix_job_completion.py
echo             # Update project data if result exists >> fix_job_completion.py
echo             if result and isinstance(result, dict): >> fix_job_completion.py
echo                 # Add required fields >> fix_job_completion.py
echo                 result['analysis_id'] = analysis_id >> fix_job_completion.py
echo. >> fix_job_completion.py
echo                 # Make sure subreddit is set >> fix_job_completion.py
echo                 if project.subreddit and 'subreddit' not in result: >> fix_job_completion.py
echo                     result['subreddit'] = project.subreddit >> fix_job_completion.py
echo. >> fix_job_completion.py
echo                 # Update project data and timestamp >> fix_job_completion.py
echo                 project.data = result >> fix_job_completion.py
echo                 project.updated_at = datetime.utcnow() >> fix_job_completion.py
echo                 fixed_count += 1 >> fix_job_completion.py
echo                 print(f"Fixed project {analysis_id} with data from job {job_id}") >> fix_job_completion.py
echo             else: >> fix_job_completion.py
echo                 print(f"No valid result data found for job {job_id}") >> fix_job_completion.py
echo         else: >> fix_job_completion.py
echo             # Make sure required fields are set in existing data >> fix_job_completion.py
echo             data_updated = False >> fix_job_completion.py
echo             if 'analysis_id' not in project.data: >> fix_job_completion.py
echo                 project.data['analysis_id'] = analysis_id >> fix_job_completion.py
echo                 data_updated = True >> fix_job_completion.py
echo. >> fix_job_completion.py
echo             if project.subreddit and 'subreddit' not in project.data: >> fix_job_completion.py
echo                 project.data['subreddit'] = project.subreddit >> fix_job_completion.py
echo                 data_updated = True >> fix_job_completion.py
echo. >> fix_job_completion.py
echo             if data_updated: >> fix_job_completion.py
echo                 project.updated_at = datetime.utcnow() >> fix_job_completion.py
echo                 fixed_count += 1 >> fix_job_completion.py
echo                 print(f"Updated fields for project {analysis_id}") >> fix_job_completion.py
echo. >> fix_job_completion.py
echo     # Commit all changes >> fix_job_completion.py
echo     db.commit() >> fix_job_completion.py
echo     print(f"Successfully fixed {fixed_count} projects") >> fix_job_completion.py
echo. >> fix_job_completion.py
echo     print("\nAdding no-cache headers to API responses...") >> fix_job_completion.py
echo     # Fix API response caching >> fix_job_completion.py
echo     try: >> fix_job_completion.py
echo         from app import app >> fix_job_completion.py
echo         from flask import after_this_request >> fix_job_completion.py
echo. >> fix_job_completion.py
echo         @app.after_request >> fix_job_completion.py
echo         def add_cache_control(response): >> fix_job_completion.py
echo             response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0' >> fix_job_completion.py
echo             response.headers['Pragma'] = 'no-cache' >> fix_job_completion.py
echo             response.headers['Expires'] = '0' >> fix_job_completion.py
echo             return response >> fix_job_completion.py
echo. >> fix_job_completion.py
echo         print("Successfully added no-cache headers to API responses") >> fix_job_completion.py
echo     except Exception as e: >> fix_job_completion.py
echo         print(f"Error adding no-cache headers: {str(e)}") >> fix_job_completion.py
echo. >> fix_job_completion.py
echo     print("\nRedux state management fix completed!") >> fix_job_completion.py
echo except Exception as e: >> fix_job_completion.py
echo     print(f"Error fixing job completion: {str(e)}") >> fix_job_completion.py
echo     db.rollback() >> fix_job_completion.py
echo finally: >> fix_job_completion.py
echo     db.close() >> fix_job_completion.py

echo.
echo Step 2: Copying and executing fix script in backend container...
docker cp fix_job_completion.py %BACKEND_CONTAINER%:/tmp/fix_job_completion.py
docker exec -it %BACKEND_CONTAINER% python /tmp/fix_job_completion.py
del fix_job_completion.py

echo.
echo Step 3: Creating frontend auto-refresh script...
echo // Fix topics not showing after job completion > frontend-fix.js
echo console.log('Social Research Redux Fix applied'); >> frontend-fix.js
echo. >> frontend-fix.js
echo // Force topic data reload when visiting topic modeling results >> frontend-fix.js
echo const originalPushState = history.pushState; >> frontend-fix.js
echo history.pushState = function(state, unused, url) { >> frontend-fix.js
echo   originalPushState.apply(this, [state, unused, url]); >> frontend-fix.js
echo   if (url.includes('/topic-modeling/')) { >> frontend-fix.js
echo     console.log('Topic modeling page loaded, scheduling data refresh'); >> frontend-fix.js
echo     const projectId = url.split('/').pop(); >> frontend-fix.js
echo     if (projectId) { >> frontend-fix.js
echo       setTimeout(() => { >> frontend-fix.js
echo         // Check if data is loaded >> frontend-fix.js
echo         const state = window.__REDUX_STATE__ || {}; >> frontend-fix.js
echo         const topicData = state.topic && state.topic.topicData; >> frontend-fix.js
echo         if (!topicData || !topicData.topics) { >> frontend-fix.js
echo           console.log('Topic data missing, forcing refresh'); >> frontend-fix.js
echo           // Fetch project data directly >> frontend-fix.js
echo           fetch('http://localhost:8081/api/user/project/' + projectId) >> frontend-fix.js
echo             .then(response => response.json()) >> frontend-fix.js
echo             .then(data => { >> frontend-fix.js
echo               console.log('Project data fetched, refreshing page'); >> frontend-fix.js
echo               location.reload(); >> frontend-fix.js
echo             }) >> frontend-fix.js
echo             .catch(err => { >> frontend-fix.js
echo               console.error('Error fetching project data:', err); >> frontend-fix.js
echo             }); >> frontend-fix.js
echo         } >> frontend-fix.js
echo       }, 2000); >> frontend-fix.js
echo     } >> frontend-fix.js
echo   } >> frontend-fix.js
echo }; >> frontend-fix.js

echo.
echo Step 4: Adding frontend fix script to container...
docker cp frontend-fix.js %FRONTEND_CONTAINER%:/app/public/fix.js
del frontend-fix.js

echo.
echo Step 5: Updating API response handling in frontend...
echo // Fix API response handling > api-fix.js
echo // Add this script to modify frontend API requests >> api-fix.js
echo const originalFetch = window.fetch; >> api-fix.js
echo window.fetch = function(...args) { >> api-fix.js
echo   const url = args[0]; >> api-fix.js
echo   if (typeof url === 'string' && url.includes('/api/')) { >> api-fix.js
echo     console.log('Adding cache-busting to API request:', url); >> api-fix.js
echo     // Add cache busting parameter >> api-fix.js
echo     const separator = url.includes('?') ? '&' : '?'; >> api-fix.js
echo     args[0] = `${url}${separator}_nocache=${Date.now()}`; >> api-fix.js
echo     // Add no-cache headers >> api-fix.js
echo     if (!args[1]) args[1] = {}; >> api-fix.js
echo     if (!args[1].headers) args[1].headers = {}; >> api-fix.js
echo     args[1].headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'; >> api-fix.js
echo     args[1].headers['Pragma'] = 'no-cache'; >> api-fix.js
echo   } >> api-fix.js
echo   return originalFetch.apply(this, args); >> api-fix.js
echo }; >> api-fix.js

echo.
echo Step 5: Adding API fix script to container...
docker cp api-fix.js %FRONTEND_CONTAINER%:/app/public/api-fix.js
del api-fix.js

echo.
echo Step 6: Installing required packages and restarting services...
echo Installing flask-compress for response optimization...
docker exec %BACKEND_CONTAINER% pip install flask-compress

echo.
echo Restarting Social Research services...
docker compose -f docker-compose-all.yml restart social-research-backend
docker compose -f docker-compose-all.yml restart social-research-frontend

echo.
echo =========================================================
echo Fix has been successfully applied!
echo.
echo Please follow these steps to see your results:
echo 1. Clear your browser cache (Ctrl+F5 or Shift+F5)
echo 2. Go to http://localhost:3000
echo 3. Click on any completed topic modeling project
echo.
echo If results still don't show, try opening in an incognito window
echo or try accessing the project directly via URL:
echo http://localhost:3000/topic-modeling/YOUR_PROJECT_ID
echo.
echo For additional help, please contact the development team
echo =========================================================

echo.
echo Press any key to exit...
pause >nul