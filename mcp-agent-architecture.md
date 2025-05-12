# NXT Humans AI CX Workbench - MCP Agent Integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Launchpad Frontend                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐  │
│  │ Reddit Data │  │   Social    │  │  Journey    │  │  Chat  │  │
│  │  Collector  │  │  Research   │  │   Mapper    │  │ Agent  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────┘  │
└─────────────────────────────────────────────────────────────────┘
              │             │              │             │
              │             │              │             │
              ▼             ▼              ▼             ▼
┌──────────────────────────────────────────────────────────────────┐
│                         WebSocket Proxy                          │
└──────────────────────────────────────────────────────────────────┘
              │             │              │             │
              │             │              │             │
              ▼             ▼              ▼             ▼
┌──────────────┐   ┌────────────────┐   ┌────────────┐   ┌────────┐
│ Reddit MCP   │   │ Social MCP     │   │ Journey MCP│   │Agent   │
│ Service      │   │ Service        │   │ Service    │   │Service │
└──────────────┘   └────────────────┘   └────────────┘   └────────┘
       │                  │                   │               │
       │                  │                   │               │
       │                  │                   │               │
       ▼                  ▼                   ▼               ▼
┌──────────────┐   ┌────────────────┐   ┌────────────┐    ┌─────────┐
│ Reddit       │   │ Social Research│   │ Journey    │    │Anthropic│
│ Ripper       │   │ Tool           │   │ Mapper     │    │Claude API│
└──────────────┘   └────────────────┘   └────────────┘    └─────────┘
```

## Component Details

### 1. Launchpad Frontend

The existing launchpad frontend will be enhanced with a chat interface component. This component will:
- Provide a collapsible/expandable chat window 
- Handle file uploads through the chat interface
- Support multimedia messages (text, files, links)
- Send/receive messages to the MCP Agent service

### 2. WebSocket Proxy

The existing WebSocket proxy in the launchpad app.py will be used for:
- Routing WebSocket connections from frontend to appropriate services
- Managing conversation state and connection lifecycle
- Implementing retry/reconnect logic for failed connections

### 3. MCP Services

Each MCP service is a lightweight wrapper around the corresponding CX Workbench tool:

#### 3.1 Reddit MCP Service
- Exposes Reddit Ripper capabilities through standardized MCP interface
- Translates natural language requests into Reddit Ripper API calls
- Functions:
  - Fetch posts from specific subreddits
  - Apply time and popularity filters
  - Generate PDF reports
  - Return structured data for agent consumption

#### 3.2 Social Research MCP Service
- Exposes Social Research analytics through standardized MCP interface
- Translates natural language requests into Social Research API calls
- Functions:
  - Perform topic modeling on social data
  - Execute sentiment analysis on topics/keywords
  - Provide search capabilities for social insights
  - Return visualizations and analysis summaries

#### 3.3 Journey Mapper MCP Service
- Exposes Journey Mapper capabilities through standardized MCP interface
- Accepts file uploads through MCP protocol
- Functions:
  - Process uploaded customer data files
  - Generate journey maps from data
  - Analyze customer journeys
  - Return visualizations and insights

#### 3.4 Agent Orchestration Service
- Manages conversation context and history
- Handles complex requests that require multiple tool invocations
- Integrates with Anthropic Claude API 
- Implements MCP Host that discovers and registers available tools
- Routes appropriate requests to the correct tool services
- Handles conversation flow and follow-ups

## Data Flow

1. **User Interaction**
   - User sends message/file through chat interface
   - Frontend relays message to WebSocket Proxy

2. **Message Processing**
   - WebSocket Proxy forwards message to Agent Service
   - Agent Service sends the message to Claude API
   - Claude determines if a tool needs to be used

3. **Tool Invocation**
   - If a tool is needed, Agent Service sends request to appropriate MCP Service
   - MCP Service translates the request to tool-specific API calls
   - Tool performs requested operations and returns results

4. **Response Generation**
   - Results from tool operations are sent back to Agent Service
   - Agent Service forwards results to Claude API for contextualization
   - Claude generates user-friendly response
   - Response is sent back through WebSocket to frontend

5. **File Handling**
   - Files uploaded through chat are sent to Agent Service
   - If for Journey Mapper, Agent Service forwards to Journey MCP Service
   - Journey MCP Service processes the file and returns results
   - Agent Service contextualizes results with Claude and sends response

## Implementation Approach

1. **Develop in Parallel**
   - Implement minimal MCP services for each tool first
   - Build agent orchestration service
   - Create chat interface component
   - Integrate components through existing proxy

2. **Extend Incrementally**
   - Start with basic functionality (text queries)
   - Add file upload capabilities
   - Implement multi-step workflows
   - Add rich response formatting

3. **Testing Strategy**
   - Unit test each MCP service independently
   - Test agent orchestration with mock tool services
   - End-to-end testing of complete workflows

## Security Considerations

- All API keys (especially Anthropic API key) stored securely
- Input validation on all user requests
- Rate limiting for API calls
- Authentication integrated with existing system (if applicable)
- Sanitization of content shared between services

## Docker Integration

- New Docker services defined for each MCP component
- Shared network with existing services
- Volume mappings for file sharing where needed
- Resource constraints to prevent overutilization