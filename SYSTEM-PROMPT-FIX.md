# System Prompt Fix for Reddit PDF Generation

## Issue Identified

After implementing aliases for Reddit tools in the Reddit MCP service, we observed that Claude still had trouble identifying the correct tool for PDF generation tasks. The logs showed:

1. User requested: "generate a pdf of the last 100 posts in the stabledifussion subreddit"
2. Claude attempted to use nonexistent tools like "reddit.get_posts"
3. Claude tried fallbacks with "social.search" and "journey.generate_map"
4. None of these attempts succeeded

The root cause was that while we added the proper tool aliases to the Reddit MCP service (including `reddit.generate_pdf`), the system prompt instructing Claude on which tools to use hadn't been updated to mention these new tools.

## Fix Implemented

We made the following changes to the system prompt in `mcp-services/agent/app.py`:

1. Enhanced the Reddit data collection section to explicitly mention the PDF generation tool
2. Added clear instructions for handling PDF generation requests
3. Provided specific guidance on when to use each tool

### Before:
```
## REDDIT DATA COLLECTION

When a user wants to collect data from Reddit:

1. Ask for the subreddit name
2. Ask for the time period (day/week/month/year/all)
3. Ask for the number of posts (default: 100)
4. Ask for the comments per post (default: 30)
5. Use reddit_collect_data tool
6. Check status with reddit_get_job_status
7. When complete, describe the results
```

### After:
```
## REDDIT DATA COLLECTION

When a user wants to collect data from Reddit:

1. Ask for the subreddit name
2. Ask for the time period (day/week/month/year/all)
3. Ask for the number of posts (default: 100)
4. Ask for the comments per post (default: 30)
5. Use one of these tools based on the request:
   - For general data collection: reddit_collect_data or reddit.search
   - For PDF generation specifically: reddit.generate_pdf
6. Check status with reddit_get_job_status
7. When complete, describe the results

For PDF generation requests specifically:
1. If user asks for a PDF, use the reddit.generate_pdf tool directly
2. Set appropriate limit parameter (100 is a good default)
3. The tool will return a job_id that you can use to check status
4. When complete, provide the download links from reddit.get_results
```

## Applying the Fix

To apply this fix, run the restart script:

```bash
./restart-agent.sh
```

This script will:
1. Restart the agent service to apply the updated system prompt
2. Verify that the agent service is healthy after restart
3. Provide instructions for testing the fix

## Testing the Fix

To test that the fix has been properly applied:

1. Ask the chatbot: "Generate a PDF of the last 100 posts on the StableDiffusion subreddit"
2. Observe Claude's response - it should now directly use the reddit.generate_pdf tool
3. Check that it successfully returns a job ID
4. Verify that you can track progress and eventually receive download links

## Lessons Learned

This issue highlights the importance of ensuring full consistency between:

1. **Tool Implementation**: The actual tools implemented in MCP services
2. **System Prompt**: Instructions that tell Claude which tools exist and how to use them
3. **Parameter Handling**: Ensuring parameters are consistently handled 

When adding new tool aliases or functionality, we must:
1. Add the tool implementation in the appropriate MCP service
2. Update the system prompt to inform Claude about the new tool
3. Add examples of when and how to use the tool
4. Ensure parameter handling is consistent throughout the stack

## Next Steps

1. **Monitor Tool Usage**: Analyze logs to see if Claude consistently uses the correct tools
2. **System Prompt Maintenance**: Consider automating system prompt updates when tools change
3. **Testing**: Develop comprehensive tests for all tool chains, including edge cases
4. **Documentation**: Update all documentation to reflect the latest tool capabilities