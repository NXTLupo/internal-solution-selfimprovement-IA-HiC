#!/bin/bash
# Script to run tests in the Docker container

# Default to running the endpoint tests
if [ $# -eq 0 ]; then
    echo "Running API endpoint tests"
    docker exec -it internal-solutions-socialresearch-backend-1 python -m pytest test/topic_model/test_topic_model_endpoint.py -v
    exit $?
fi

# Check for help flag
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: run_docker_tests.sh [OPTIONS] [TEST_PATHS...]"
    echo ""
    echo "Options:"
    echo "  --endpoints     Run endpoint tests"
    echo "  --coverage      Run with coverage reporting"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run_docker_tests.sh               # Run endpoint tests"
    echo "  ./run_docker_tests.sh --endpoints   # Run endpoint tests"
    echo "  ./run_docker_tests.sh --coverage    # Run with coverage reporting"
    exit 0
fi

# Process command line arguments
case "$1" in
    --endpoints)
        echo "Running API endpoint tests..."
        docker exec -it internal-solutions-socialresearch-backend-1 python -m pytest test/topic_model/test_topic_model_endpoint.py -v
        exit $?
        ;;
    --coverage)
        echo "Running with coverage reporting..."
        docker exec -it internal-solutions-socialresearch-backend-1 python -m pytest test/topic_model/test_topic_model_endpoint.py -v --cov=app.routes.api_topic_model --cov-report=term --cov-report=html:test/logs/coverage_report
        exit $?
        ;;
    *)
        # Custom test path
        echo "Running specified tests: $*"
        docker exec -it internal-solutions-socialresearch-backend-1 python -m pytest "$@"
        exit $?
        ;;
esac 