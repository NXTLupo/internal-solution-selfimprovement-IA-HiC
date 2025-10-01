# Social Data Collector - Unified Multi-Source Platform

## Overview

The Social Data Collector has been extended to support multiple data sources for comprehensive social media and review analysis. Originally designed for Reddit data collection, it now includes TrustPilot review scraping with a unified interface and export system.

## Supported Data Sources

### 1. Reddit
- **Data Type**: Community posts and discussions
- **Collection**: Subreddit posts with comments
- **Parameters**:
  - Time filters (day, week, month, year, all)
  - Post count (up to 1000)
  - Comments per post (up to 50)

### 2. TrustPilot
- **Data Type**: Company reviews and ratings
- **Collection**: Customer reviews with ratings
- **Parameters**:
  - Sort by recency or rating
  - Review count (up to 1000)
  - Minimum rating filter (1-5 stars)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Interface                         │
│                  (Source Selection)                      │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Unified API Layer                        │
│                  /api/collect                           │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐        ┌────────▼────────┐
│ Reddit         │        │ TrustPilot      │
│ Collector      │        │ Collector       │
│                │        │                 │
│ - PRAW API     │        │ - BeautifulSoup │
│ - Rate Limited │        │ - Web Scraping  │
└───────┬────────┘        └────────┬────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Unified Export                          │
│               (PDF, JSON, CSV)                          │
└──────────────────────────────────────────────────────────┘
```

## Installation

### 1. Install Dependencies

```bash
cd internal-solutions-reddit-ripper
pip install -r requirements.txt
```

### 2. Run the Application

```bash
# Using the unified app (recommended)
python app_unified.py

# Or using Docker
docker compose -f docker-compose-all.yml up reddit-ripper
```

The application will be available at `http://localhost:5001`

## API Documentation

### Get Available Sources

```http
GET /api/sources
```

Response:
```json
{
  "sources": [
    {
      "name": "reddit",
      "label": "Reddit",
      "params": {...}
    },
    {
      "name": "trustpilot",
      "label": "TrustPilot",
      "params": {...}
    }
  ]
}
```

### Start Collection

```http
POST /api/collect
Content-Type: application/json
```

Reddit Request Body:
```json
{
  "source": "reddit",
  "target": "technology",
  "count": 100,
  "time_filter": "month",
  "comments_per_post": 5
}
```

TrustPilot Request Body:
```json
{
  "source": "trustpilot",
  "target": "amazon.com",
  "count": 100,
  "sort_by": "recency",
  "min_rating": 3
}
```

### Check Status

```http
GET /api/status/{job_id}
```

Response:
```json
{
  "job_id": "uuid",
  "source": "trustpilot",
  "target": "amazon.com",
  "status": "running",
  "progress": 45,
  "total": 100,
  "collected": 45,
  "files": []
}
```

### Download Results

```http
GET /api/download/{job_id}/{filename}
```

## Data Format

### Unified Output Structure

Both Reddit and TrustPilot data are normalized to a common format:

```json
{
  "source": "reddit|trustpilot",
  "collected_at": "2025-01-01T12:00:00",
  "item_count": 100,
  "metadata": {
    // Source-specific metadata
  },
  "items": [
    {
      "id": "unique_id",
      "title": "Post/Review title",
      "selftext": "Body content",
      "score": 42,  // Upvotes or helpful votes
      "num_comments": 5,
      "created": 1234567890,
      "author": "username",
      "comments": [...]
    }
  ]
}
```

### TrustPilot to Reddit Mapping

| TrustPilot Field | Reddit Field | Notes |
|-----------------|--------------|-------|
| Review Title + Rating | title | Format: "5⭐ - Great service" |
| Review Body | selftext | Full review text |
| Helpful Votes | score | Number of helpful votes |
| Company Reply | comments | Company responses as comments |
| Company Name | subreddit | Company name with underscores |

## Testing

### Run Tests

```bash
# Test TrustPilot integration
python test_trustpilot.py

# Test unified collectors
python -m pytest tests/
```

### Manual Testing

1. **Reddit Collection**:
   ```bash
   curl -X POST http://localhost:5001/api/collect \
     -H "Content-Type: application/json" \
     -d '{"source": "reddit", "target": "python", "count": 10}'
   ```

2. **TrustPilot Collection**:
   ```bash
   curl -X POST http://localhost:5001/api/collect \
     -H "Content-Type: application/json" \
     -d '{"source": "trustpilot", "target": "spotify.com", "count": 10}'
   ```

## Export Formats

### PDF Export
- Formatted reports with headers
- Batched into 100-item files
- Includes metadata and summaries

### JSON Export
- Complete raw data
- Preserves all fields
- Suitable for further processing

### CSV Export (Coming Soon)
- Tabular format
- Flattened structure
- Excel-compatible

## Integration with Social Research Tool

The collected data can be directly imported into the Social Research Tool for advanced analysis:

1. **Topic Modeling**: Identify trending themes
2. **Sentiment Analysis**: Measure customer satisfaction
3. **Engagement Metrics**: Track interaction patterns
4. **Comparative Analysis**: Compare Reddit discussions vs TrustPilot reviews

## Rate Limiting & Ethics

- **Reddit**: 10-second delay between requests (PRAW default)
- **TrustPilot**: 2-second delay between page requests
- **Concurrent Jobs**: Limited to prevent overwhelming sources
- **Respectful Scraping**: Follows robots.txt and terms of service

## Troubleshooting

### Common Issues

1. **TrustPilot scraping fails**
   - HTML structure may have changed
   - Update selectors in `trustpilot_scraper.py`
   - Check browser console for actual structure

2. **Rate limiting errors**
   - Increase delay in scraper configuration
   - Reduce batch size

3. **Memory issues with large collections**
   - Use smaller batch sizes
   - Enable streaming export

## Future Enhancements

- [ ] Add more sources (Yelp, Google Reviews, Twitter/X)
- [ ] Implement caching for repeated requests
- [ ] Add real-time streaming for large datasets
- [ ] Create unified analytics dashboard
- [ ] Add sentiment pre-processing
- [ ] Implement data deduplication
- [ ] Add scheduling for periodic collection

## Contributing

To add a new data source:

1. Create model in `models/[source].py`
2. Implement collector in `services/[source]_collector.py`
3. Extend `CollectorFactory` with new source
4. Add frontend fields in `index_unified.html`
5. Update parameter schemas
6. Add tests

## License

Part of the NXT Humans AI CX Workbench - Proprietary