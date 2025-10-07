# Port Conflict Management for NXT HUMANS AI CX WORKBENCH

This document describes the enhanced port conflict detection and resolution capabilities added to the workbench.

## Overview

The NXT HUMANS AI CX WORKBENCH requires multiple ports for its various services. Port conflicts can occur when:

1. Other applications are using the default ports
2. Multiple instances of the workbench are running
3. System services are bound to required ports
4. Previous workbench sessions didn't terminate properly

The port conflict management system automatically detects these conflicts and provides solutions to resolve them.

## Key Components

### 1. Port Scanner (`port_scanner.py`)

This Python script provides comprehensive port conflict detection and resolution:

- Scans for conflicts across all workbench services
- Identifies processes using conflicting ports
- Suggests alternative available ports
- Can automatically update configuration to use alternative ports
- Optionally terminates conflicting processes (with user permission)

#### Usage:

```bash
# Scan for port conflicts and display results
python port_scanner.py

# Scan and automatically fix conflicts by updating .env file
python port_scanner.py --fix

# Scan, kill conflicting processes, and update .env
python port_scanner.py --fix --kill

# Get detailed JSON output (for programmatic use)
python port_scanner.py --json
```

### 2. Enhanced Startup Script (`enhanced-check-and-run.sh`)

An improved startup script that incorporates port conflict management:

- Detects and resolves port conflicts before starting services
- Works with both Docker and non-Docker deployments
- Dynamically configures services based on available ports
- Improves reliability of container-to-container communication

#### Usage:

```bash
# Start with default settings (uses Docker if available)
./enhanced-check-and-run.sh

# Force non-Docker mode (Launchpad only)
./enhanced-check-and-run.sh --no-docker

# Enable AI Agent (requires Docker)
./enhanced-check-and-run.sh --with-agent
```

### 3. Docker Host Updater (`update_docker_hosts.py`)

A utility to ensure reliable container-to-container communication:

- Automatically determines container IP addresses
- Updates Docker Compose files with correct host mappings
- Improves WebSocket stability in the AI Agent
- Fixes network-related "connection refused" errors

#### Usage:

```bash
# Update Docker Compose files with current container IPs
python update_docker_hosts.py

# Update and restart all containers
python update_docker_hosts.py --restart
```

## Port Configuration

The workbench uses the following default ports:

| Service                  | Default Port | Environment Variable       |
|--------------------------|--------------|----------------------------|
| Launchpad                | 8000         | LAUNCHPAD_PORT             |
| Journey Mapper           | 8080         | JOURNEY_MAPPER_PORT        |
| Reddit Ripper            | 5001         | REDDIT_RIPPER_PORT         |
| Social Research Frontend | 3000         | SOCIAL_RESEARCH_PORT       |
| Social Research Backend  | 8081         | SOCIAL_RESEARCH_BACKEND_PORT |
| Agent Orchestrator       | 8500         | AGENT_PORT                 |
| Reddit MCP               | 8501         | REDDIT_MCP_PORT            |
| Social MCP               | 8502         | SOCIAL_MCP_PORT            |
| Journey MCP              | 8503         | JOURNEY_MCP_PORT           |

These ports can be configured in the `.env` file or as environment variables.

## How Port Conflict Resolution Works

1. **Detection**: The system scans all required ports to check if they're in use
2. **Analysis**: For each conflict, the system identifies the process using the port
3. **Resolution**: The system follows one of these strategies:
   - **Alternative Port**: Find and use an available port on the same host
   - **Process Termination**: Kill the process using the conflicting port (with permission)
   - **Manual Resolution**: Provide information for the user to resolve manually
4. **Configuration**: Update all relevant configuration files with new port assignments
5. **Verification**: Double-check that the new ports are available before starting services

## Integration with Docker

The port conflict management system works with Docker deployments by:

1. Scanning host ports before starting containers
2. Updating port mappings in Docker Compose files
3. Ensuring container-to-container communication uses correct host bindings
4. Setting appropriate environment variables for cross-service communication

## Troubleshooting

If you experience port-related issues:

1. Run `python port_scanner.py` to identify any conflicts
2. Check the `.env` file for correct port assignments
3. Verify Docker container port mappings with `docker compose ps`
4. Use `netstat -tuln` (Linux/macOS) or `netstat -an` (Windows) to check port usage
5. For persistent issues, try `./enhanced-check-and-run.sh --no-docker` to use direct execution

## Additional Information

- The system automatically prioritizes the default ports when available
- Port selections are saved to the `.env` file for persistence across restarts
- In Docker mode, internal container ports remain fixed; only host bindings change
- Non-Docker mode only starts the Launchpad service, other services must be started manually

## Adding New Services

When adding new services to the workbench:

1. Add the service's default port to the `DEFAULT_PORTS` dictionary in `port_scanner.py`
2. Update the Docker Compose files to use the environment variable for port mapping
3. Add appropriate environment variables for service-to-service communication

## Security Considerations

- The port scanner only checks localhost (127.0.0.1) connections
- Process termination requires user confirmation by default
- The system only modifies ports in the workbench configuration, not system settings
- No persistent changes are made to the system outside the workbench directory