# PDF URL Fix Documentation

## Issue Identified

The PDF URLs returned by the Reddit MCP service are not rendering correctly in the agent's responses. The logs show:

1. Claude correctly uses the `reddit.collect_posts` (or similar) tool and gets a job_id
2. Claude successfully checks the status with `reddit.get_status` 
3. When getting results from `reddit.get_results`, the PDF URL is being incorrectly displayed as:
   ```
   https://storage.googleapis.com/nxt-humans-dev-public-bucket/social-research/63c2e52c-b1e2-4d66-8a3b-8df2e3e30c49_report.pdf
   ```

This appears to be a Google Cloud Storage URL, but our code should be generating URLs in the format:
```
http://localhost:5001/api/download/{job_id}/{filename}.pdf
```

## Root Causes

After analysis, there are several potential root causes:

1. **Environment Variable Override**: The `REDDIT_RIPPER_CLIENT_URL` environment variable might be set incorrectly in the Docker configuration.

2. **URL Construction Issues**: The `urljoin` function might not be constructing URLs correctly.

3. **Claude URL Generation**: Claude might be replacing the URLs with its own generated ones.

4. **Agent Response Formatting**: The agent's response formatting might be altering the URLs.

## Implemented Fixes

The following fixes have been implemented in `mcp-services/reddit-mcp/app.py.fixed`:

1. **Enhanced URL Validation**:
   ```python
   # Validate the URL format - ensure it's using http(s):// and not some other protocol
   if not external_pdf_url.startswith(('http://', 'https://')):
       logger.warning(f"Invalid URL format detected: {external_pdf_url}")
       external_pdf_url = f"http://localhost:5001/api/download/{job_id}/{file}"
   ```

2. **Improved Logging**:
   ```python
   logger.info(f"REDDIT_RIPPER_CLIENT_URL environment value: {reddit_ripper_client_url}")
   logger.info(f"Returning {len(pdf_urls)} PDF URLs: {pdf_urls}")
   ```

3. **Debug Information Field**:
   ```python
   debug_info = {
       "original_files": files,
       "internal_urls": [urljoin(REDDIT_RIPPER_URL, f"/api/download/{job_id}/{file}") for file in files],
       "environment_pdf_url": reddit_ripper_client_url,
       "full_job_info": status_data
   }
   ```

4. **PDF Job Tracking**:
   ```python
   # Store additional info in the job cache to mark this as a PDF generation job
   job_cache[result['job_id']]["is_pdf_job"] = True
   ```

## Applying the Fix

To apply this fix:

1. Run the updated Reddit tool fix script:
   ```bash
   ./fix-reddit-tools.sh
   ```

2. Restart the reddit-mcp service:
   ```bash
   docker-compose -f docker-compose-agent.yml restart reddit-mcp
   ```

3. Check the logs to see the enhanced debugging information:
   ```bash
   docker-compose -f docker-compose-agent.yml logs reddit-mcp
   ```

## Testing the Fix

To test if the PDF URL fix is working:

1. Ask the chatbot to collect data from a subreddit:
   ```
   Can you collect data from the StableDiffusion subreddit?
   ```

2. After the data collection completes, ask for a PDF:
   ```
   Can you generate a PDF from this data?
   ```

3. Check the logs to see the actual URLs being generated:
   ```bash
   docker-compose -f docker-compose-agent.yml logs reddit-mcp | grep "PDF URL"
   ```

4. Verify that the URL in Claude's response matches the expected format:
   ```
   http://localhost:5001/api/download/{job_id}/{filename}.pdf
   ```

## Environment Variable Configuration

In the event that the PDF URLs are still not working correctly, you may need to explicitly set the `REDDIT_RIPPER_CLIENT_URL` environment variable in your Docker configuration.

Add this to the `reddit-mcp` service in `docker-compose-agent.yml`:

```yaml
environment:
  - PORT=8501
  - REDDIT_RIPPER_URL=http://reddit-ripper:5000
  - REDDIT_RIPPER_CLIENT_URL=http://localhost:5001
```

Then restart the service:
```bash
docker-compose -f docker-compose-agent.yml up -d
```

## Additional Troubleshooting

If the URLs still appear incorrectly after these fixes, you may need to:

1. **Check Network Configuration**: Make sure the reddit-ripper service is properly exposed on port 5001

2. **Examine Docker Network**: Verify docker network configurations in `docker-compose-agent.yml`

3. **Test Direct Access**: Try accessing `http://localhost:5001/api/download/{job_id}/{file}` directly to verify it works

4. **Check Agent Processing**: Review how the agent processes tool results before sending them to Claude