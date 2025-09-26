import pytest
import sys
import argparse

if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Run topic model endpoint tests")
    parser.add_argument("--coverage", action="store_true", help="Run tests with coverage")
    args = parser.parse_args()
    
    # Set up test options
    test_args = ["-v", "test/topic_model/test_topic_model_endpoint.py"]
    
    # Add coverage options if requested
    if args.coverage:
        test_args.extend([
            "--cov=app.routes.api_topic_model",
            "--cov-report=term",
            "--cov-report=html:test/logs/coverage_report"
        ])
    
    # Run the tests
    print(f"Running tests with args: {' '.join(test_args)}")
    exit_code = pytest.main(test_args)
    sys.exit(exit_code) 