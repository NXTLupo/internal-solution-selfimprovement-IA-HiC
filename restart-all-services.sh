#!/bin/bash

# This script restarts all services in the NXT HUMANS AI CX WORKBENCH

echo "Stopping all services..."
./stop-workbench.sh

echo "Waiting for services to fully stop..."
sleep 5

echo "Starting all services with updated UI components..."
./check-and-run.sh

echo "Services have been restarted with standardized headers and favicons."
echo "You can access the Launchpad at http://localhost:8000"