# NXT HUMANS AI CX WORKBENCH - Copilot Instructions

This document provides essential guidance for AI agents working within the NXT Humans Intelligence Augmentation Suite codebase.

## 📖 Big Picture: Architecture

This is a large-scale, polyglot microservices platform built on Docker. The core of the system is an AI agent that orchestrates over a dozen specialized AI/data services.

- **Microservices**: The architecture consists of 12+ services, each running in its own Docker container. Service source code is primarily located in directories prefixed with `internal-solutions-`.
- **Central Orchestrator**: The `agent` service (port 8500, source in `mcp-services/agent/app.py`) is the brain. It receives user requests via a WebSocket connection and invokes other services to fulfill them. This is the most critical component.
- **Entrypoint**: The `launchpad` service (port 8000, source in `launchpad/app.py`) serves the main web UI and acts as a WebSocket proxy, routing all frontend communication to the `agent`.
- **Service Integration**: Services are integrated with the agent via the **Model Context Protocol (MCP)**. Lightweight MCP wrappers (in `mcp-services/`) provide a standardized interface for the agent to call the core services.
- **Configuration**: All configuration, including API keys and service ports, is managed centrally in the root `.env` file.

**Data Flow:**
`Client Browser -> Launchpad (8000) -> Agent (8500) -> MCP Services (8501+) -> Core Services (5001+, 8080+, etc.)`

## 🚀 Developer Workflow

The entire platform is designed to be run via Docker. The development environment is primarily Windows.

### Initial Setup & Launch

1.  **Environment Configuration**: Create a `.env` file in the project root (you can copy `.env.example`). Populate it with the necessary API keys, especially `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`.
2.  **Launch the Platform**: Use the main launch script. This script handles Docker Compose orchestration.
    ```bash
    ./launch.sh
    ```

### Common Tasks & Debugging

- **Check API Keys**: Before launching, verify API key validity.
  ```bash
  python test-anthropic-api.py
  python test_openai_api.py
  ```
- **Resolve Port Conflicts**: Port conflicts are a common issue. A utility script is provided to fix them.
  ```bash
  python port_scanner.py --fix
  ```
- **Agent is Unresponsive**: If the main agent stops working, the quickest fix is to restart its container.
  ```bash
  docker compose -f docker-compose-all.yml restart agent
  ```
- **Check Service Logs**: To debug a specific service, view its Docker logs.
  ```bash
  # Example for the 'agent' service
  docker compose -f docker-compose-all.yml logs -f agent
  ```

## ⚙️ Conventions & Key Patterns

- **Security**: **NEVER** hardcode API keys or other secrets. All secrets must be read from environment variables populated by the `.env` file.
- **File Paths**: The primary development environment is Windows. Be mindful of file path separators (`\`) when working with scripts that interact with the filesystem.
- **Adding a New Service**: To add a new tool, you typically need to:
    1. Create the core service (e.g., a Python/Flask or Node/Express app).
    2. Create a lightweight MCP wrapper for it in `mcp-services/`.
    3. Add the new services to `docker-compose-all.yml`.
    4. Integrate the new tool into the agent's logic in `mcp-services/agent/app.py`.
- **Key Files**:
    - `.env`: Central configuration hub.
    - `docker-compose-all.yml`: Defines all services and their relationships.
    - `launch.sh`: Primary entry point for starting the entire platform.
    - `mcp-services/agent/app.py`: The core logic for the AI agent orchestrator. **Modify with extreme caution.**
    - `port_scanner.py`: Critical utility for ensuring the environment can start correctly.
