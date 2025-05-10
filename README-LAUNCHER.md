# NXT Humans AI CX Workbench Launcher

This launcher provides an easy way to start and access all components of the NXT Humans AI CX Workbench with robust handling of Docker availability and port conflicts.

## Getting Started

### Method 1: Using the Desktop Launcher (Recommended)

1. Double-click the **NXT Humans Workbench** icon on your desktop
2. The launcher will:
   - Check if Docker is running
   - If Docker is available:
     - Resolve any port conflicts
     - Start services using Docker Compose
     - Open your browser to the Workbench Launchpad
   - If Docker is NOT available:
     - Start just the Launchpad service locally using Python
     - Provide instructions for starting the other services
3. From the Launchpad, you can access all services (when available)

### Method 2: Using the Check-and-Run Script

1. Open a terminal in the workbench directory
2. Run the following command:
   ```bash
   ./check-and-run.sh
   ```
3. This script provides the most robust startup experience:
   - Works with or without Docker
   - Handles port conflicts automatically
   - Provides detailed status information

### Method 3: Using Docker Compose Directly (Advanced Users)

1. Open a terminal in the workbench directory
2. Run the following command:
   ```bash
   docker compose -f dynamic-compose.yml up
   ```
3. This requires Docker to be running and doesn't handle port conflicts automatically

### Method 4: Running Services Directly (No Docker Required)

1. Open a terminal in the workbench directory
2. Run the Launchpad service:
   ```bash
   cd launchpad
   python app.py
   ```
3. Open a browser to http://localhost:8000

## Application Ports

The workbench uses dynamic port allocation to avoid conflicts with other services:

- **Default Ports** (if available):
  - **Launchpad**: http://localhost:8000
  - **Journey Mapper**: http://localhost:8080
  - **Reddit Ripper**: http://localhost:5000
  - **Social Research Tool**: http://localhost:3000

- **Dynamic Port Assignment**:
  - The quick-launch script automatically checks for port availability
  - If a default port is in use, it will find the next available port
  - The Launchpad interface displays the actual ports being used
  - Port assignments are saved to the `.env` file for future launches
  
- **Manual Port Configuration**:
  - You can manually set ports by editing the `.env` file
  - Format: `SERVICE_PORT=number` (e.g., `LAUNCHPAD_PORT=9000`)

## Stopping the Workbench

- Use the dedicated stop script:
  ```bash
  ./stop-workbench.sh
  ```
- If using Docker Compose directly, press Ctrl+C in the terminal or run:
  ```bash
  docker compose -f dynamic-compose.yml down
  ```

## Troubleshooting

1. **Docker Issues**
   - Ensure Docker is installed and running
   - Check Docker has sufficient resources (CPU/Memory)
   - If Docker fails to access files on the external drive, ensure proper permissions

2. **Port Conflicts**
   - The quick-launch script automatically handles port conflicts
   - If you prefer to manually configure ports, edit the `.env` file
   - The Launchpad page displays current port assignments in real-time
   - Port badge color indicates if a default port (gray) or dynamic port (blue) is being used

3. **Application Not Loading**
   - Check service status indicators on the Launchpad (green = running, red = offline)
   - Containers may take a minute to fully start
   - The Launchpad automatically checks service status every 10 seconds
   - Check Docker logs with: `docker compose logs [service-name]`

4. **Lost or Changed Ports**
   - If you close and reopen the workbench, it will automatically find available ports
   - Previous port assignments are saved in `.env` and reused when possible
   - The Launchpad's "Service URLs" section always shows current port assignments