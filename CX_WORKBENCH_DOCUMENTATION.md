# CX WORKBENCH DOCUMENTATION

## Overview

The NXT HUMANS AI CX WORKBENCH is a comprehensive platform designed for analyzing customer experiences. It integrates various tools and AI models to provide insights into customer behavior, sentiment, and journey. This document provides a detailed overview of the system's architecture, components, and implementation.

## System Architecture

The CX Workbench follows a modular architecture based on the Model Context Protocol (MCP). This allows for seamless integration of different tools and AI models. The main components of the system are:

*   **Launchpad UI:** The user interface for accessing the tools and the AI Agent.
*   **Agent Orchestrator:** The central service that manages the conversation with the AI model and orchestrates tool calls.
*   **MCP Services:** Lightweight API wrappers around the core tools, exposing their functionality in a standardized format.
*   **Core Tools:** The core applications that perform the actual data harvesting, analysis, and journey mapping tasks.
*   **AI Models:** The AI models used for natural language understanding, generation, and data analysis.

## Components

### 1. Launchpad UI

*   **Description:** The Launchpad UI is a React/Next.js-based interface that provides access to all the tools and the AI Agent.
*   **Functionality:**
    *   Provides a user-friendly interface for interacting with the CX Workbench.
    *   Allows users to launch the core tools.
    *   Integrates a chat widget for interacting with the AI Agent.
    *   Handles file uploads for the Journey Mapper tool.
*   **Key Files:**
    *   `launchpad/templates/index.html`: The main HTML template for the launchpad UI.
    *   `launchpad/templates/enhanced-index.html`: An enhanced HTML template for the launchpad UI.
    *   `launchpad/static/nxt-humans-styles.css`: CSS styles for the launchpad UI.
    *   `launchpad/app.py`: Flask application that serves as the main launchpad.
*   **Implementation Details:**
    *   The UI is built using React and Next.js.
    *   It uses CSS for styling and Font Awesome for icons.
    *   It dynamically retrieves URLs for various services from environment variables.
    *   It periodically checks the status of each service by making HTTP requests to their respective URLs.
    *   It includes JavaScript code for updating the status indicators, URLs, and ports for each service.
    *   It integrates a chatbot debug panel for debugging the AI Agent.

### 2. Agent Orchestrator

*   **Description:** The Agent Orchestrator is a FastAPI application that manages the conversation with the AI model and orchestrates tool calls.
*   **Functionality:**
    *   Receives messages from the Launchpad UI.
    *   Manages the conversation history.
    *   Constructs prompts for the AI model.
    *   Parses the AI model's responses to identify tool calls.
    *   Invokes the appropriate MCP services.
    *   Formats the tool results and sends them back to the AI model.
    *   Sends the final response to the Launchpad UI.
    *   Handles file uploads and forwards them to the Journey Mapper tool.
*   **Key Files:**
    *   `mcp-services/agent/app.py`: The main application file for the Agent Orchestrator.
    *   `mcp-services/agent/requirements.txt`: The Python dependencies for the Agent Orchestrator.
*   **Implementation Details:**
    *   The application is built using FastAPI.
    *   It uses the Anthropic Claude API for natural language processing.
    *   It retrieves configuration parameters from environment variables.
    *   It uses Pydantic models for structuring data.
    *   It uses in-memory dictionaries for storing conversation state, uploaded files, and tool definitions.
    *   It fetches tool definitions from the MCP services at startup.
    *   It constructs a detailed system message for the AI model.
    *   It includes error handling for various operations.
    *   It uses the `logging` module to log information and errors.

### 3. MCP Services

*   **Description:** The MCP services are lightweight API wrappers around the core tools, exposing their functionality in a standardized format.
*   **Functionality:**
    *   Receive requests from the Agent Orchestrator.
    *   Invoke the corresponding tool.
    *   Format the tool results and return them to the Agent Orchestrator.
*   **Types:**
    *   **Reddit MCP:** Wraps the Reddit Ripper tool.
    *   **Social MCP:** Wraps the Social Research tool.
    *   **Journey MCP:** Wraps the Journey Mapper tool.
*   **Key Files:**
    *   `mcp-services/reddit-mcp/app.py`: The main application file for the Reddit MCP service.
    *   `mcp-services/reddit-mcp/requirements.txt`: The Python dependencies for the Reddit MCP service.
    *   `mcp-services/social-mcp/app.py`: The main application file for the Social MCP service.
    *   `mcp-services/social-mcp/requirements.txt`: The Python dependencies for the Social MCP service.
    *   `mcp-services/journey-mcp/app.py`: The main application file for the Journey MCP service.
    *   `mcp-services/journey-mcp/requirements.txt`: The Python dependencies for the Journey MCP service.
*   **Implementation Details:**
    *   The applications are built using FastAPI.
    *   They use HTTP requests to communicate with the core tools.
    *   They define MCP tools for each tool's functionality.
    *   They include error handling for various operations.
    *   They use the `logging` module to log information and errors.

### 4. Core Tools

*   **Description:** The core tools are the applications that perform the actual data harvesting, analysis, and journey mapping tasks.
*   **Types:**
    *   **Reddit Ripper:** A tool for scraping data from Reddit.
    *   **Social Research:** A tool for performing topic modeling and sentiment analysis on social media data.
    *   **Journey Mapper:** A tool for generating customer journey maps from various data sources.
*   **Key Files:**
    *   `internal-solutions-reddit-ripper/app.py`: The main application file for the Reddit Ripper tool.
    *   `internal-solutions-socialresearch/backend/run.py`: The main application file for the Social Research tool.
    *   `internal-solutions-journeymapper/run.py`: The main application file for the Journey Mapper tool.
*   **Implementation Details:**
    *   The tools are implemented using Python and various libraries for data harvesting, analysis, and visualization.
    *   They may have their own APIs or CLIs for interacting with them.

### 5. AI Models

*   **Claude 3.7 Sonnet:**
    *   **Description:** A large language model from Anthropic.
    *   **Functionality:**
        *   Natural language understanding.
        *   Natural language generation.
        *   Tool selection.
        *   Response generation.
    *   **Usage:**
        *   The Agent Orchestrator uses the Claude 3.7 Sonnet model to process user messages and generate responses.
        *   The Agent Orchestrator constructs prompts for the Claude 3.7 Sonnet model, including the system message, the conversation history, and any tool references.
        *   The Agent Orchestrator sends the prompts to the Claude 3.7 Sonnet model via the Anthropic API.
*   **Transformer-based models:**
    *   **Description:** A type of machine learning model used for various natural language processing tasks.
    *   **Functionality:**
        *   Topic modeling.
        *   Sentiment analysis.
    *   **Usage:**
        *   The Social Research tool uses transformer-based models for topic modeling and sentiment analysis.
*   **LDA (Latent Dirichlet Allocation):**
    *   **Description:** A traditional topic modeling technique.
    *   **Functionality:**
        *   Topic modeling.
    *   **Usage:**
        *   The Social Research tool uses LDA in combination with transformer-based models for topic modeling.
*   **Roberta:**
    *   **Description:** A sentiment analysis algorithm.
    *   **Functionality:**
        *   Sentiment analysis.
    *   **Usage:**
        *   The Social Research tool uses Roberta for sentiment analysis.

## Model Context Protocol (MCP)

The CX Workbench utilizes a Model Context Protocol (MCP) architecture to enable communication between the system and the core tools.

*   **MCP Services:** The Reddit MCP, Social MCP, and Journey MCP services act as MCP servers, providing access to the core tools' functionality through standardized APIs.
*   **Agent Orchestrator:** The Agent Orchestrator acts as an MCP client, discovering and invoking tools exposed by the MCP services.
*   **Benefits:**
    *   **Modularity:** Allows for a modular and extensible system, where new tools can be easily added by creating new MCP services.
    *   **Standardization:** Provides a standardized way for AI models to invoke external tools and receive structured responses.
    *   **Decoupling:** Decouples the AI model from the core tools, allowing for independent development and updates.

### MCP Endpoints

Each MCP service implements the following endpoints:

*   `/mcp/tools`: Returns a list of available tools and their specifications.
*   `/mcp/invoke/{tool_name}`: Invokes a specific tool with parameters.

### Available Tools

1.  **Reddit Tools**
    *   `reddit.search`: Search for posts on Reddit.
        *   Parameters:
            *   `subreddit`: The subreddit to search.
            *   `query`: The search query.
            *   `time_filter`: The time filter (hour, day, week, month, year, all).
            *   `limit`: The maximum number of posts to retrieve.
            *   `comments_per_post`: The maximum number of comments to retrieve per post.
        *   Returns:
            *   `job_id`: The job ID to check the status of the search.
    *   `reddit.get_status`: Check the status of a search job.
        *   Parameters:
            *   `job_id`: The job ID from a previous search request.
        *   Returns:
            *   `status`: The job status (pending, running, completed, failed).
            *   `progress`: The progress percentage (0-100).
            *   `message`: A status message or error details.
            *   `files`: A list of generated files when completed.
    *   `reddit.get_results`: Get the results of a completed search.
        *   Parameters:
            *   `job_id`: The job ID from a previous search request.
            *   `include_content`: Whether to include full post content.
        *   Returns:
            *   `posts`: A list of posts retrieved.
            *   `pdf_urls`: URLs to download generated PDFs.

2.  **Social Research Tools**
    *   `social.topic_model`: Perform topic modeling on collected data.
        *   Parameters:
            *   `data_source`: The source of data (e.g., 'reddit', 'twitter').
            *   `search_query`: The query to search for in the dataset.
            *   `num_topics`: The number of topics to identify (default: auto).
            *   `topic_terms`: The number of terms per topic.
        *   Returns:
            *   `job_id`: The job ID for tracking status.
    *   `social.get_topic_status`: Check the status of a topic modeling job.
        *   Parameters:
            *   `job_id`: The job ID from a previous topic modeling request.
        *   Returns:
            *   `status`: The job status (pending, running, completed, failed).
            *   `progress`: The progress percentage (0-100).
            *   `message`: A status message or error details.
    *   `social.get_topic_results`: Get the results of a completed topic modeling job.
        *   Parameters:
            *   `job_id`: The job ID from a previous topic modeling request.
        *   Returns:
            *   `topics`: A list of identified topics.
            *   `visualization_url`: A URL to access the topic visualization.
    *   `social.sentiment_analysis`: Perform sentiment analysis on social media data.
        *   Parameters:
            *   `search_query`: Query to analyze sentiment for.
            *   `data_source`: Source of data (e.g., 'reddit', 'twitter').
            *   `sentiment_type`: Sentiment analysis algorithm to use (default: roberta).
        *   Returns:
            *   `job_id`: Job ID for tracking sentiment analysis.
    *   `social.get_sentiment_results`: Get the results of a completed sentiment analysis job.
        *   Parameters:
            *   `job_id`: Job ID from a previous sentiment analysis request.
        *   Returns:
            *   `sentiment`: Overall sentiment analysis results.
            *   `visualization_url`: URL to access the sentiment visualization.
    *   `social.search`: Search for posts in the social research database.
        *   Parameters:
            *   `query`: Search query.
            *   `data_source`: Source of data (e.g., 'reddit', 'twitter').
            *   `limit`: Maximum number of results.
        *   Returns:
            *   `search_id`: ID for reference in other calls.
            *   `results`: List of search results.

3.  **Journey Mapper Tools**
    *   `journey.upload_file`: Upload a file for journey mapping.
        *   Parameters:
            *   `file`: File to upload (PDF, CSV, TXT, or JSON).
            *   `file_name`: Name of the file (if not provided in file object).
        *   Returns:
            *   `file_id`: ID for the uploaded file, for use in other API calls.
            *   `file_name`: Name of the uploaded file.
            *   `file_type`: Detected file type.
    *   `journey.generate_map`: Generate a customer journey map from uploaded file.
        *   Parameters:
            *   `file_id`: ID of previously uploaded file.
            *   `journey_name`: Name for the journey map.
            *   `description`: Description of the journey context.
        *   Returns:
            *   `journey_id`: ID of the generated journey for tracking.
    *   `journey.get_status`: Check the status of a journey map generation.
        *   Parameters:
            *   `journey_id`: Journey ID from a previous generation request.
        *   Returns:
            *   `status`: Status of journey generation (pending, in_progress, completed, failed).
            *   `progress`: Progress percentage (0-100).
            *   `message`: Status message or error.
    *   `journey.get_results`: Get the results of a completed journey mapping.
        *   Parameters:
            *   `journey_id`: Journey ID from a previous generation request.
        *   Returns:
            *   `journey_map`: Journey map data structure.
            *   `visualization_url`: URL to view the journey map visualization.
            *   `stages`: List of journey stages.
            *   `insights`: Insights derived from journey analysis.
    *   `journey.list_maps`: List all available journey maps.
        *   Parameters: None
        *   Returns:
            *   `journey_maps`: List of available journey maps.

## Data Flow

The data flow within the CX Workbench can be summarized as follows:

1.  **User Input:** The user interacts with the Launchpad UI, providing a message or uploading a file.
2.  **Agent Orchestration:** The Launchpad sends the user input to the Agent Orchestrator.
3.  **AI Processing:** The Agent Orchestrator uses Claude 3.7 Sonnet to understand the user's intent and determine the appropriate course of action.
4.  **Tool Invocation (if needed):** If Claude determines that a tool is needed, the Agent Orchestrator invokes the corresponding MCP service.
5.  **Tool Execution:** The MCP service executes the tool and returns the results to the Agent Orchestrator.
6.  **Response Generation:** The Agent Orchestrator combines the tool results with Claude's response to generate a final output.
7.  **User Output:** The Launchpad UI displays the final output to the user.

## AI Models

The CX Workbench utilizes the following AI models:

*   **Claude 3.7 Sonnet:**
    *   Used by the Agent Orchestrator for natural language understanding and generation.
    *   Enables the AI Agent to understand user requests, select appropriate tools, and generate coherent responses.
*   **Transformer-based models:**
    *   Used by the Social Research tool for topic modeling and sentiment analysis.
    *   Enable the identification of key themes and emotional tones in social media data.
*   **LDA (Latent Dirichlet Allocation):**
    *   Used by the Social Research tool for topic modeling.
    *   Provides a statistical approach to identifying topics in a collection of documents.
*   **Roberta:**
    *   Used by the Social Research tool for sentiment analysis.
    *   Provides a pre-trained model for accurately assessing the sentiment expressed in text.

## Security Considerations

The following security measures are implemented in the CX Workbench:

*   **Secure API Key Management:** All API keys are passed securely via environment variables, preventing them from being hardcoded in the code.
*   **Input Validation:** File uploads are validated and sanitized to prevent malicious code from being executed.
*   **Data Minimization:** The agent does not store conversation history permanently, reducing the risk of data breaches.
*   **Access Control:** Tool access is controlled through the MCP services, ensuring that the AI Agent only has access to the tools that it needs.

## Known Limitations

The following limitations exist in the current implementation of the CX Workbench:

*   **File Upload Size Limits:** Large file uploads may be limited by WebSocket message size limits.
*   **Complex Workflows:** Complex multi-step tool workflows may require multiple interactions with the AI Agent.
*   **Limited Tool Access:** The AI Agent has access only to the tools explicitly made available through MCP services.

## Future Enhancements

The following enhancements are planned for future releases of the CX Workbench:

*   **Improved File Upload Handling:** Implement a more robust file upload mechanism that supports larger files and provides progress updates.
*   **Workflow Automation:** Automate complex multi-step tool workflows to reduce the number of interactions required with the AI Agent.
*   **Expanded Tool Access:** Integrate additional tools and data sources into the CX Workbench.
*   **Enhanced AI Models:** Explore the use of more advanced AI models for natural language understanding, generation, and data analysis.

## Conclusion

The NXT HUMANS AI CX WORKBENCH provides a powerful and flexible platform for customer experience analysis. By integrating AI and a modular architecture, the CX Workbench enables users to gain valuable insights into customer behavior, sentiment, and journey. This documentation provides a comprehensive overview of the system's architecture, components, and implementation, serving as a valuable resource for developers and maintainers.
