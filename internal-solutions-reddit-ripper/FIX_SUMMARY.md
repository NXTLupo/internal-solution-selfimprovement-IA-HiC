# Fix Summary - Social Data Collector Deployment

## Issues Fixed

### Issue 1: Template Not Found Error
**Problem**: `jinja2.exceptions.TemplateNotFound: index_unified.html`
- The app was looking for `index_unified.html` but we had renamed it to `index.html`

**Fix Applied**:
- Updated `app_unified.py` line 248 to use `index.html` instead of `index_unified.html`

### Issue 2: Legacy Reddit Endpoint Error
**Problem**: `AttributeError: can't set attribute` when calling `/api/scrape`
- Tried to modify `request.json` which is read-only in Flask

**Fix Applied**:
- Rewrote the legacy endpoint to directly create a job and call the background worker
- Now properly handles backward compatibility

## Current Status: ✅ WORKING

### Verified Working:
1. **Web Interface**: http://localhost:5001 loads correctly
2. **Reddit Collection**: Legacy `/api/scrape` endpoint works
3. **TrustPilot Collection**: New `/api/collect` endpoint works
4. **API Discovery**: `/api/sources` returns both sources
5. **Job Status**: `/api/status/{job_id}` tracks progress
6. **File Downloads**: PDF and JSON exports generate correctly

## Test Commands

```bash
# Test Reddit (legacy)
curl -X POST http://localhost:5001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"subreddit":"python","post_count":2,"time_filter":"week","comments_per_post":1}'

# Test TrustPilot (new)
curl -X POST http://localhost:5001/api/collect \
  -H "Content-Type: application/json" \
  -d '{"source":"trustpilot","target":"spotify.com","count":2,"sort_by":"recency"}'

# Check job status
curl http://localhost:5001/api/status/{job_id}

# Get available sources
curl http://localhost:5001/api/sources
```

## Files Modified
1. `docker-compose-all.yml` - Changed to use `app_unified.py`
2. `app_unified.py` - Fixed template name and legacy endpoint
3. `templates/index.html` - Renamed from `index_unified.html`
4. `templates/index_original.html` - Backup of original

## Service Information
- **Port**: 5001 (external) → 5000 (internal)
- **Container**: nxt-humans_ai_cx_workbench-reddit-ripper-1
- **Image**: python:3.9-slim
- **Status**: Running and healthy