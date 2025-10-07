# HTTPS Timeout Analysis - All Services

## ✅ Services WITH Extended Timeouts (Protected)

| Service | HTTPS Port | Timeout | Reason |
|---------|------------|---------|---------|
| **Launchpad** | 8443 | 24 hours | WebSocket connections for AI Agent |
| **Journey Mapper (Claude 3.7)** | 8444 | 30 minutes | AI journey mapping processing |
| **OpenAI Journey Mapper (o3)** | 8445 | 30 minutes | o3 reasoning model processing |
| **Video Transcriptor** | 8448 | 30 minutes | Large video file transcription |
| **LinkedIn Generator** | 8449 | 30 minutes | Extended Thinking AI pipeline |
| **Miro Generator** | 8450 | 15 minutes | Board generation processing |

## ⚠️ Services WITHOUT Extended Timeouts (Potential Issues)

| Service | HTTPS Port | Default Timeout | Potential Issues |
|---------|------------|-----------------|------------------|
| **Reddit Data Collector** | 8446 | ~60 seconds | ⚠️ Large subreddit scraping jobs |
| **Social Research Tool** | 8447 | ~60 seconds | ⚠️ Topic modeling & sentiment analysis |

## 🔍 Risk Assessment

### High Risk for Timeouts:
1. **Reddit Data Collector (8446)**:
   - Large subreddit scraping (1000+ posts)
   - Comment collection (100+ per post)
   - PDF generation for large datasets
   - **Expected time**: 2-15 minutes for large jobs

2. **Social Research Tool (8447)**:
   - Topic modeling with BERTopic on large datasets
   - Sentiment analysis processing
   - Vector database operations with pgvector
   - **Expected time**: 3-20 minutes for complex analysis

### Services That DON'T Need Extended Timeouts:
- **Journey Mapper (Claude 4)**: Not available via HTTPS proxy (direct HTTP only)
- **Static file serving**: Instant response
- **Simple API calls**: Complete in seconds

## 🚨 Missing Services That Need Timeout Fixes:

### Reddit Data Collector (Port 8446)
- **Current**: No extended timeouts (default ~60s)
- **Needed**: 10-15 minutes for large scraping jobs
- **Risk**: High - users frequently scrape large subreddits

### Social Research Tool (Port 8447)  
- **Current**: No extended timeouts (default ~60s)
- **Needed**: 15-20 minutes for complex topic modeling
- **Risk**: High - analytics operations can be very long

## 💡 Recommendation:
Add extended timeouts to Reddit Data Collector and Social Research Tool HTTPS endpoints.