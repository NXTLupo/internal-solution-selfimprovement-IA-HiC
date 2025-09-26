# Social Research Tool Fixes

## Recent Fix: ERR_EMPTY_RESPONSE When Loading Project Data

### Problem Description

The Social Research Tool was experiencing an issue where the frontend would display:
- "Analyzing topics..." stuck state even after jobs completed successfully
- Empty response errors (ERR_EMPTY_RESPONSE) when trying to load existing project data
- Successful job creation but failures when viewing results

### Root Causes

1. **Large Response Size**: The API response from `/api/user/project/<id>` endpoint was too large for the browser to handle efficiently, especially with extensive Reddit data.

2. **Missing Compression**: Responses weren't compressed, causing unnecessary data transfer size.

3. **No Response Size Optimization**: Large datasets were being sent without optimization or limiting.

4. **Browser Cache Issues**: After errors occurred, browser caching would sometimes prevent successful reloads.

### Implemented Fixes

1. **Added Response Compression**: Installed and configured Flask-Compress to enable gzip compression for API responses.

2. **Optimized Large Responses**: Modified the `/api/user/project/<id>` endpoint to:
   - Detect large response sizes (>10MB)
   - Optimize and limit extremely large result sets (limit to 50 items for initial display)
   - Add proper caching headers for browser optimization

3. **Enhanced Error Handling**: Added proper error recovery and detailed logging.

4. **Created Recovery Scripts**: 
   - `fix_social_research_optimized.bat`: Optimizes backend and adds compression
   - `restart_social_research_service.bat`: Safely restarts all Social Research services
   - `fix_topic_analysis.py`: Fixes stuck jobs in "processing" state

### How to Fix ERR_EMPTY_RESPONSE Issues

1. Run the optimization script to add compression and response size management:
```
.\fix_social_research_optimized.bat
```

2. Clear your browser cache:
   - Chrome: Ctrl+Shift+Delete → Select "Cached images and files" → "Clear data"
   - Firefox: Ctrl+Shift+Delete → Select "Cache" → "Clear Now"
   - Edge: Ctrl+Shift+Delete → Select "Cached images and files" → "Clear now"

3. Try loading your project again

4. If you still see "Analyzing topics...", run:
```
python fix_topic_analysis.py --fix-all
```

## Previous Issues Fixed

1. **Database Transaction Issue**: Added missing `db.commit()` and return statement in `reddit_repository.py`.
2. **CORS Configuration**: Updated CORS settings in `__init__.py` to allow all origins during development.
3. **Missing Dependencies**: Added required dependencies to `requirements.txt`:
   - Flask and related packages
   - python-dotenv
   - praw (Reddit API wrapper)
   - pandas and requests
   - bertopic and transformers (ML packages)
4. **Database Configuration**: Enhanced Alembic setup for proper database connections.

## Optimization Improvements

Created optimized Docker setup to improve build and rebuild times:

1. **Multi-stage Dockerfile**: Separated dependencies into layers for better caching.
   - Stage 1: Base system dependencies
   - Stage 2: Core Python dependencies (Flask, SQLAlchemy, etc.)
   - Stage 3: Heavy ML dependencies (BERTopic, Transformers)
   - Stage 4: Final application code

2. **Split Requirements**: Separated dependencies into two files:
   - `requirements-light.txt`: Fast-installing core dependencies
   - `requirements-heavy.txt`: Heavy ML/AI dependencies

3. **Build Scripts**: Created scripts to handle building and running the optimized container:
   - `fix_social_research_optimized.sh`: Linux/macOS version
   - `fix_social_research_optimized.bat`: Windows version

4. **Pre-downloaded NLTK Data**: To avoid runtime delays.

5. **Dockerignore**: Added comprehensive `.dockerignore` file to reduce build context size.

## Using the Improved Setup

### Option 1: Quickstart with Original Fix

```bash
# Windows
.\fix_social_research_backend.bat

# Linux/macOS
./fix_social_research_backend.sh
```

### Option 2: Optimized Setup (Recommended)

```bash
# Windows
.\fix_social_research_optimized.bat

# Linux/macOS
./fix_social_research_optimized.sh
```

The optimized version significantly improves rebuild times:
- First build: Similar time (8-12 minutes)
- Rebuilds with code changes: 30-60 seconds (vs. 8-12 minutes)
- Light dependency changes: 2-3 minutes
- Heavy dependency changes: 5-8 minutes

## Verification

The backend should be accessible at: http://localhost:8081
The frontend should be accessible at: http://localhost:3000

Verify backend health with: `curl http://localhost:8081/health`