# TrustPilot Extension Deployment Guide

## Status: ✅ DEPLOYED

The Social Data Collector has been successfully extended to support both Reddit and TrustPilot data collection.

## Changes Made

### 1. Docker Configuration
- **File**: `docker-compose-all.yml`
- **Change**: Updated reddit-ripper service to use `app_unified.py` instead of `app.py`
- **Line**: 212
- **Backward Compatible**: Yes - legacy endpoints still work

### 2. Frontend Template
- **Original**: `templates/index.html` → renamed to `index_original.html` (backup)
- **New**: `templates/index_unified.html` → renamed to `index.html` (active)
- **Features**: Source selector for Reddit/TrustPilot

### 3. New Files Added
```
internal-solutions-reddit-ripper/
├── models/
│   ├── __init__.py
│   └── trustpilot.py          # TrustPilot data models
├── services/
│   ├── __init__.py
│   ├── trustpilot_scraper.py  # TrustPilot scraping logic
│   └── collectors.py           # Unified collector interface
├── app_unified.py              # New unified application
├── test_trustpilot.py          # Test suite
├── startup.sh                  # Linux startup script
├── test_local.bat             # Windows test script
├── README_UNIFIED.md          # Documentation
└── DEPLOYMENT.md              # This file
```

### 4. Updated Dependencies
- **File**: `requirements.txt`
- **New Dependencies**:
  - beautifulsoup4>=4.11.0 (web scraping)
  - requests>=2.28.0 (HTTP requests)
  - pandas>=1.5.0 (data processing)
  - python-dateutil>=2.8.2 (date handling)

## Deployment Commands

### Start with Docker Compose
```bash
# Start all services including updated Reddit Ripper
docker compose -f docker-compose-all.yml up -d

# Or just restart Reddit Ripper service
docker compose -f docker-compose-all.yml restart reddit-ripper

# Check logs
docker compose -f docker-compose-all.yml logs -f reddit-ripper
```

### Local Testing (Windows)
```batch
# Run the test script
cd internal-solutions-reddit-ripper
test_local.bat
```

### Local Testing (Linux/Mac)
```bash
cd internal-solutions-reddit-ripper
chmod +x startup.sh
./startup.sh
```

## API Endpoints

### New Unified Endpoints
- `POST /api/collect` - Start collection from any source
- `GET /api/sources` - Get available sources and parameters
- `GET /api/status/{job_id}` - Check collection status
- `GET /api/download/{job_id}/{filename}` - Download results

### Legacy Reddit Endpoints (Still Working)
- `POST /api/scrape` - Original Reddit scraping
- All original endpoints remain functional

## Testing the Deployment

### 1. Test Reddit Collection (Legacy)
```bash
curl -X POST http://localhost:5001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "subreddit": "technology",
    "post_count": 10,
    "time_filter": "week",
    "comments_per_post": 3
  }'
```

### 2. Test TrustPilot Collection (New)
```bash
curl -X POST http://localhost:5001/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "source": "trustpilot",
    "target": "amazon.com",
    "count": 10,
    "sort_by": "recency"
  }'
```

### 3. Check Available Sources
```bash
curl http://localhost:5001/api/sources
```

## Rollback Instructions

If you need to rollback to the original Reddit-only version:

1. **Revert Docker Compose**:
   ```yaml
   # Change line 212 in docker-compose-all.yml from:
   command: >-
     bash -c "pip install -r requirements.txt && python app_unified.py"
   # Back to:
   command: >-
     bash -c "pip install -r requirements.txt && python app.py"
   ```

2. **Restore Original Template**:
   ```bash
   cd internal-solutions-reddit-ripper/templates
   mv index.html index_unified.html
   mv index_original.html index.html
   ```

3. **Restart Service**:
   ```bash
   docker compose -f docker-compose-all.yml restart reddit-ripper
   ```

## Verification Checklist

- [x] Docker configuration updated
- [x] Frontend template switched
- [x] Dependencies documented
- [x] Backward compatibility maintained
- [x] Test scripts created
- [x] Documentation complete

## Port Mappings (Unchanged)

- External: `5001`
- Internal: `5000`
- No conflicts with existing services

## Integration with Other Services

### Reddit MCP Wrapper (Port 8501)
- Still communicates with reddit-ripper on port 5000
- Legacy endpoints ensure compatibility
- No changes needed to MCP wrapper

### Social Research Tool
- Can now process TrustPilot data
- Uses same analysis pipeline
- Topic modeling works with reviews

## Known Issues & Solutions

### Issue: Module Import Errors
**Solution**: Ensure all dependencies are installed
```bash
docker compose -f docker-compose-all.yml exec reddit-ripper pip install -r requirements.txt
```

### Issue: TrustPilot Scraping Fails
**Solution**: HTML structure may have changed
- Check `services/trustpilot_scraper.py`
- Update CSS selectors if needed

### Issue: Port Already in Use
**Solution**: Use port scanner
```bash
python port_scanner.py --fix
```

## Support

For issues or questions:
1. Check `test_trustpilot.py` for testing
2. Review `README_UNIFIED.md` for usage
3. Check Docker logs: `docker logs nxt-humans_ai_cx_workbench-reddit-ripper-1`

## Next Steps

1. **Test in Production**: Verify both Reddit and TrustPilot collection work
2. **Monitor Performance**: Check scraping speeds and rate limits
3. **Extend MCP Wrapper**: Update to support TrustPilot in agent
4. **Add More Sources**: Yelp, Google Reviews, etc.