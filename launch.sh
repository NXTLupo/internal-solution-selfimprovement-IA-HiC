#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}${BOLD}"
echo "███╗   ██╗██╗  ██╗████████╗    ██╗  ██╗██╗   ██╗███╗   ███╗ █████╗ ███╗   ██╗███████╗"
echo "████╗  ██║╚██╗██╔╝╚══██╔══╝    ██║  ██║██║   ██║████╗ ████║██╔══██╗████╗  ██║██╔════╝"
echo "██╔██╗ ██║ ╚███╔╝    ██║       ███████║██║   ██║██╔████╔██║███████║██╔██╗ ██║███████╗"
echo "██║╚██╗██║ ██╔██╗    ██║       ██╔══██║██║   ██║██║╚██╔╝██║██╔══██║██║╚██╗██║╚════██║"
echo "██║ ╚████║██╔╝ ██╗   ██║       ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║  ██║██║ ╚████║███████║"
echo "╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝"
echo "                                                                                       "
echo "            █████╗ ██╗    ██████╗██╗  ██╗    ██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗     "
echo "           ██╔══██╗██║   ██╔════╝╚██╗██╔╝    ██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝     "
echo "           ███████║██║   ██║      ╚███╔╝     ██║ █╗ ██║██║   ██║██████╔╝█████╔╝      "
echo "           ██╔══██║██║   ██║      ██╔██╗     ██║███╗██║██║   ██║██╔══██╗██╔═██╗      "
echo "           ██║  ██║██║   ╚██████╗██╔╝ ██╗    ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗     "
echo "           ╚═╝  ╚═╝╚═╝    ╚═════╝╚═╝  ╚═╝     ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝     "
echo -e "${NC}"

echo -e "${GREEN}${BOLD}NXT HUMANS WORKBENCH LAUNCHER${NC}"
echo -e "${BLUE}======================================${NC}"

# Function to check if a process is running on a port
check_port() {
  lsof -i:$1 >/dev/null 2>&1
  return $?
}

# Function to kill process on a port
kill_port() {
  echo -e "${YELLOW}Killing process on port $1...${NC}"
  lsof -ti:$1 | xargs kill -9 2>/dev/null || true
}

# Function to check if Docker is running
check_docker() {
  docker info >/dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Docker is running.${NC}"
    return 0
  else
    echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
    return 1
  fi
}

# Ensure the .env file has API keys and proper formatting
setup_env_file() {
  echo -e "${YELLOW}Setting up environment...${NC}"
  
  if [ -f .env ]; then
    # Add newline at end if missing
    if [ "$(tail -c 1 .env)" != "" ]; then
      echo "" >> .env
    fi
    
    # Make sure we have API keys defined
    if ! grep -q "ANTHROPIC_API_KEY" .env || ! grep -q "OPENAI_API_KEY" .env; then
      echo -e "${RED}API keys are missing from .env file!${NC}"
      exit 1
    fi
    
    # Extract API keys
    ANTHROPIC_API_KEY=$(grep "ANTHROPIC_API_KEY" .env | cut -d '=' -f2)
    OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env | cut -d '=' -f2)
    
    echo -e "${GREEN}API keys found in .env file.${NC}"
  else
    echo -e "${RED}No .env file found!${NC}"
    exit 1
  fi
  
  # Make sure USE_WHISPER_API is in .env
  if ! grep -q "USE_WHISPER_API" .env; then
    echo "USE_WHISPER_API=true" >> .env
    echo -e "${YELLOW}Added USE_WHISPER_API=true to .env file${NC}"
  fi
}

# Create static directory for video analyzer
setup_static_files() {
  echo -e "${YELLOW}Setting up static files...${NC}"
  
  mkdir -p internal-solutions-video-analyzer/static
  if [ ! -f internal-solutions-video-analyzer/static/index.html ]; then
    cat > internal-solutions-video-analyzer/static/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Video Analyzer</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Video Analyzer</h1>
    <p>Upload a video or paste a YouTube URL to analyze.</p>
</body>
</html>
EOF
    echo -e "${GREEN}Created static/index.html for video analyzer${NC}"
  fi
}

# Create the video analyzer .env file with the API key
setup_video_analyzer() {
  echo -e "${YELLOW}Setting up video analyzer...${NC}"
  
  OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env | cut -d '=' -f2)
  mkdir -p internal-solutions-video-analyzer
  echo "OPENAI_API_KEY=${OPENAI_API_KEY}" > internal-solutions-video-analyzer/.env
  echo "USE_WHISPER_API=true" >> internal-solutions-video-analyzer/.env
  echo -e "${GREEN}Created .env file for video analyzer with OpenAI API key${NC}"
}

# Kill any running processes on our ports
kill_running_processes() {
  echo -e "${YELLOW}Freeing up ports...${NC}"
  
  kill_port 8000  # Launchpad
  kill_port 8080  # Journey Mapper
  kill_port 8090  # OpenAI Journey Mapper
  kill_port 5001  # Reddit Ripper
  kill_port 5002  # Video Analyzer
  kill_port 3000  # Social Research Frontend
  kill_port 8081  # Social Research Backend
  kill_port 8500  # Agent
  kill_port 8501  # Reddit MCP
  kill_port 8502  # Social MCP
  kill_port 8503  # Journey MCP
  kill_port 8504  # Video MCP
  kill_port 8505  # OpenAI Journey MCP
}

# Generate SSL certificates for HTTPS
setup_ssl_certificates() {
  echo -e "${YELLOW}Setting up SSL certificates for HTTPS...${NC}"
  
  if [ ! -d "ssl-certs" ]; then
    mkdir ssl-certs
  fi
  
  if [ ! -f "ssl-certs/localhost.crt" ] || [ ! -f "ssl-certs/localhost.key" ]; then
    echo -e "${YELLOW}Generating self-signed SSL certificates...${NC}"
    
    # Create OpenSSL configuration
    cat > ssl-certs/openssl.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = CA
L = San Francisco
O = NXT Humans
OU = AI CX Workbench
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
    
    # Generate certificate and key
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout ssl-certs/localhost.key \
      -out ssl-certs/localhost.crt \
      -config ssl-certs/openssl.conf \
      -extensions v3_req >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}SSL certificates generated successfully!${NC}"
    else
      echo -e "${RED}Failed to generate SSL certificates${NC}"
      exit 1
    fi
  else
    echo -e "${GREEN}SSL certificates already exist.${NC}"
  fi
}

# Start HTTPS proxy alongside main services
start_https_proxy() {
  echo -e "${YELLOW}Starting HTTPS proxy for secure connections...${NC}"
  
  # Wait for main services to be ready
  sleep 5
  
  # Start HTTPS proxy
  docker compose -f docker-compose-https.yml up -d
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}HTTPS proxy started successfully!${NC}"
  else
    echo -e "${YELLOW}HTTPS proxy failed to start (this is optional)${NC}"
  fi
}

# Start services using Docker
start_services() {
  echo -e "${YELLOW}Starting all services...${NC}"
  
  # Stop any existing containers
  docker compose -f docker-compose-all.yml down 2>/dev/null || true
  docker compose -f docker-compose-https.yml down 2>/dev/null || true
  docker compose down 2>/dev/null || true
  
  # Create or update the docker-compose-all.override.yml file with explicit API keys and HTTPS URLs
  cat > docker-compose-all.override.yml << EOF
services:
  launchpad:
    environment:
      # HTTPS Client URLs for secure navigation
      - JOURNEY_MAPPER_CLIENT_URL=https://localhost:8444
      - OPENAI_JOURNEY_MAPPER_CLIENT_URL=https://localhost:8445
      - REDDIT_RIPPER_CLIENT_URL=https://localhost:8446
      - SOCIAL_RESEARCH_CLIENT_URL=https://localhost:8447
      - VIDEO_ANALYZER_CLIENT_URL=https://localhost:8448
      - LINKEDIN_GENERATOR_CLIENT_URL=https://localhost:8449
      - MIRO_GENERATOR_CLIENT_URL=https://localhost:8450

  video-analyzer:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - USE_WHISPER_API=true
    volumes:
      - ./internal-solutions-video-analyzer/static:/app/static

  social-research-backend:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AZURE_OPENAI_API_KEY=${OPENAI_API_KEY}
      - AZURE_OPENAI_KEY=${OPENAI_API_KEY}

  journey-mapper:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ANTHROPIC_MODEL=claude-3-7-sonnet-20250219

  openai-journey-mapper:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=o3
      - REASONING_EFFORT=medium

  openai-journey-mcp:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  agent:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
EOF

  # Start all services
  docker compose -f docker-compose-all.yml -f docker-compose-all.override.yml up -d
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}All services started successfully!${NC}"
    # Start HTTPS proxy after main services
    start_https_proxy
  else
    echo -e "${RED}Error starting services. Check Docker logs for details.${NC}"
    exit 1
  fi
}

# Main execution starts here
setup_env_file
setup_static_files
setup_video_analyzer
setup_ssl_certificates
kill_running_processes

# Check if Docker is running
if ! check_docker; then
  echo -e "${RED}Please start Docker and try again.${NC}"
  exit 1
fi

# Start services
start_services

echo -e "\n${GREEN}${BOLD}ALL SERVICES HAVE BEEN STARTED!${NC}"
echo ""
echo -e "${GREEN}${BOLD}🌐 HTTP URLS (Original):${NC}"
echo -e "  ${BLUE}Launchpad:${NC}                http://localhost:8000"
echo -e "  ${BLUE}Journey Mapper (Claude):${NC}   http://localhost:8080"
echo -e "  ${BLUE}Journey Mapper (o3):${NC}       http://localhost:8090"
echo -e "  ${BLUE}Reddit Ripper:${NC}            http://localhost:5001"
echo -e "  ${BLUE}Video Transcriptor:${NC}       http://localhost:5002"
echo ""
echo -e "${GREEN}${BOLD}🔒 HTTPS URLS (Secure):${NC}"
echo -e "  ${BLUE}Launchpad:${NC}                https://localhost:8443"
echo -e "  ${BLUE}Journey Mapper (Claude):${NC}   https://localhost:8444"
echo -e "  ${BLUE}Journey Mapper (o3):${NC}       https://localhost:8445"
echo -e "  ${BLUE}Reddit Ripper:${NC}            https://localhost:8446"
echo -e "  ${BLUE}Video Transcriptor:${NC}       https://localhost:8448"
echo ""
echo -e "${YELLOW}${BOLD}🛡️  BROWSER SECURITY:${NC}"
echo -e "• HTTPS URLs eliminate 'Not Secure' warnings"
echo -e "• Accept security warning on first visit (self-signed cert)"
echo -e "• Both HTTP and HTTPS work - use HTTPS for secure look"
echo ""
echo -e "${YELLOW}To monitor logs:${NC}"
echo -e "  docker compose -f docker-compose-all.yml logs -f [service-name]"
echo -e "  docker compose -f docker-compose-https.yml logs -f"
echo ""
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  docker compose -f docker-compose-all.yml down"
echo -e "  docker compose -f docker-compose-https.yml down"
echo ""
echo -e "${GREEN}${BOLD}🚀 START BROWSING: Visit https://localhost:8443 for secure access!${NC}"