#!/bin/bash

# Stop the current containers
echo "Stopping current services..."
./stop-workbench.sh

# Start the containers again
echo "Restarting services..."
./check-and-run.sh

echo "Services have been restarted. Please give them a moment to fully start up."
echo "You can access the updated Launchpad at http://localhost:8000"