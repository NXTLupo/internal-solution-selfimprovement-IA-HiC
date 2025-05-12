# NXT HUMANS AI CX WORKBENCH - Tool Integration Guide

This guide explains how tools are integrated in the NXT HUMANS AI CX Workbench to enable the AI Agent to interact with all available services.

## Architecture Overview

The NXT HUMANS AI CX Workbench uses a Model Context Protocol (MCP) architecture to integrate tools. This architecture consists of:

1. **Agent Orchestrator**: The core component that communicates with Claude API and manages tool calls
2. **MCP Services**: Wrapper services for each tool (Reddit, Social Research, Journey Mapper)
3. **Tools**: The actual implementation of each service's functionality

The system uses a WebSocket interface for real-time communication between the UI and the Agent Orchestrator, which then communicates with the various MCP services.

## Available Tools

### 1. Reddit Data Collector Tools

| Tool Name | Description | Primary Parameters |
|-----------|-------------|-------------------|
| `reddit.search` | Search for posts in a subreddit | `subreddit`, `query`, `time_filter`, `limit` |
| `reddit.get_status` | Check status of a search job | `job_id` |
| `reddit.get_results` | Get results of a completed job | `job_id`, `include_content` |

### 2. Social Research Tools

| Tool Name | Description | Primary Parameters |
|-----------|-------------|-------------------|
| `social.search` | Search for posts in the database | `query`, `data_source`, `limit` |
| `social.topic_model` | Perform topic modeling | `data_source`, `search_query`, `num_topics` |
| `social.get_topic_status` | Check topic modeling status | `job_id` |
| `social.get_topic_results` | Get topic modeling results | `job_id` |
| `social.sentiment_analysis` | Perform sentiment analysis | `search_query`, `data_source` |
| `social.get_sentiment_results` | Get sentiment analysis results | `job_id` |

### 3. Journey Mapper Tools

| Tool Name | Description | Primary Parameters |
|-----------|-------------|-------------------|
| `journey.upload_file` | Upload a file for mapping | `file`, `file_name` |
| `journey.generate_map` | Generate a journey map | `file_id`, `journey_name`, `description` |
| `journey.get_status` | Check generation status | `journey_id` |
| `journey.get_results` | Get journey map results | `journey_id` |
| `journey.list_maps` | List all available maps | None |

## How Tool Integration Works

### Step 1: Tool Registration

Each MCP service exposes a `/mcp/tools` endpoint that returns a list of available tools. The Agent Orchestrator fetches these tool definitions during startup and caches them.

### Step 2: System Message Creation

The Agent Orchestrator creates a system message for Claude that includes all available tools, their descriptions, parameters, and usage instructions. This enables Claude to understand what tools are available and how to use them.

### Step 3: Tool Call Processing

When Claude generates a tool call, the Agent Orchestrator:
1. Parses the JSON response to extract the tool call
2. Identifies the target service based on the tool name
3. Forwards the tool call to the appropriate MCP service
4. Waits for the result
5. Formats and returns the result to Claude

### Step 4: Stateful Processing

For tools that involve multi-step processing (like search → status → results), the system maintains state using:
- Job IDs returned by long-running operations
- Caching in both the Agent Orchestrator and MCP services
- Formatted results that help Claude understand the flow

## Using Tools from the Chatbot

The chatbot UI connects to the Agent Orchestrator via WebSocket. User messages are sent to the Agent Orchestrator, which forwards them to Claude. When Claude decides to use a tool:

1. Claude returns a response with a structured tool call
2. The Agent Orchestrator executes the tool call
3. Results are sent back to Claude for interpretation
4. Claude generates a human-readable response that's returned to the user

## Example Tool Flows

### Reddit Data Collection

```
User: "Find posts about basketball from the NBA subreddit"

Agent (thinking): I need to search the NBA subreddit
Tool Call: reddit.search(subreddit="nba", query="basketball", time_filter="week")
Result: { "job_id": "123abc" }

Agent (thinking): I need to check if the job is complete
Tool Call: reddit.get_status(job_id="123abc")
Result: { "status": "completed", "files": ["nba_posts.pdf"] }

Agent (thinking): Now I can get the results
Tool Call: reddit.get_results(job_id="123abc")
Result: { "posts": [...], "pdf_urls": [...] }

Agent (to User): "I've found 25 posts about basketball from the NBA subreddit. Here are some highlights..."
```

### Social Research Analysis

```
User: "What are people saying about the new iPhone?"

Agent (thinking): I'll analyze sentiment about iPhone
Tool Call: social.sentiment_analysis(search_query="iPhone", data_source="reddit")
Result: { "job_id": "456def" }

Agent (thinking): Now I need to get the results
Tool Call: social.get_sentiment_results(job_id="456def")
Result: { "sentiment": { "positive_aspects": [...], "negative_aspects": [...] } }

Agent (to User): "Based on my analysis, people are positive about the iPhone's camera and performance, but have concerns about the battery life and price..."
```

### Journey Mapping

```
User: "Create a customer journey map from my survey data"

Agent (to User): "I'd be happy to create a customer journey map. Please upload your survey data file."

User: *uploads file*

Agent (thinking): I need to process this file
Tool Call: journey.upload_file(file=<file_data>, file_name="survey.csv")
Result: { "file_id": "789ghi" }

Agent (thinking): Now I can generate the journey map
Tool Call: journey.generate_map(file_id="789ghi", journey_name="Customer Survey Analysis")
Result: { "journey_id": "jkl012" }

Agent (thinking): Let me check the status
Tool Call: journey.get_status(journey_id="jkl012")
Result: { "status": "completed" }

Agent (thinking): I can now get the results
Tool Call: journey.get_results(journey_id="jkl012")
Result: { "journey_map": {...}, "visualization_url": "http://..." }

Agent (to User): "I've created your customer journey map. You can view it at this link: http://... The map shows 5 key stages in the customer journey..."
```

## Troubleshooting Tool Integration

### Common Issues

1. **Tool Not Found**: The Agent Orchestrator could not find the requested tool in its cached definitions.
   - Solution: Check that the MCP service for that tool is running and properly exposing tools.

2. **Tool Execution Error**: The tool call failed due to an error in the MCP service.
   - Solution: Check the logs of the corresponding MCP service for details.

3. **Claude Not Using Tools**: Claude is not generating tool calls when it should.
   - Solution: Enhance the system message with more explicit examples and instructions.

4. **WebSocket Connection Issues**: The chatbot UI cannot communicate with the Agent Orchestrator.
   - Solution: Check the WebSocket connection and ensure the agent service is running.

### Debugging

To debug tool integration issues:

1. Check the Agent Orchestrator logs:
   ```bash
   docker logs agent
   ```

2. Check the MCP service logs:
   ```bash
   docker logs reddit-mcp
   docker logs social-mcp
   docker logs journey-mcp
   ```

3. Review the tools registered with the Agent Orchestrator:
   ```bash
   curl http://localhost:8500/
   ```

4. Check the tools exposed by each MCP service:
   ```bash
   curl http://localhost:8501/mcp/tools
   curl http://localhost:8502/mcp/tools
   curl http://localhost:8503/mcp/tools
   ```

## Extending with New Tools

To add new tools to the system:

1. Create a new MCP service or extend an existing one
2. Implement the `/mcp/tools` endpoint to expose your tool definitions
3. Implement `/mcp/invoke/{tool_name}` endpoints for each tool
4. Restart the services for the Agent Orchestrator to discover the new tools

## Conclusion

The tool integration architecture in NXT HUMANS AI CX WORKBENCH provides a flexible, extensible way for Claude to interact with various services. By following the Model Context Protocol pattern, new tools can be easily added and integrated into the AI Agent's capabilities, making the system more powerful and versatile over time.