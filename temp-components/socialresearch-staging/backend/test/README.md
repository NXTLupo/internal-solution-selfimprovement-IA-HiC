# Backend Test Suite

This directory contains all tests for the backend API. The structure and utilities are designed for both local and Docker-based development.

## Directory Structure

```
test/
├── conftest.py                # Global test fixtures and configuration
├── run_docker_tests.sh        # Script to run tests inside Docker
├── run_endpoint_test.py       # Script to run endpoint tests (with optional coverage)
├── README.md                  # This file
├── dummy_data/                # Static dummy data for tests
│   ├── dummy.json
│   └── reddit_data.json
├── logs/                      # Test logs and coverage reports
│   ├── coverage_report/
│   ├── date_filter_test_logs/
│   └── test_logs/
│       └── topic_sentiment/
├── topic_model/               # Topic model tests
│   ├── __init__.py
│   ├── test_topic_model_endpoint.py   # Integration tests for API endpoints
│   ├── test_topic_model_process.py    # Tests for topic modeling process (with dummy data)
│   └── unit/
│       ├── __init__.py
│       └── test_utils.py      # Unit tests for utility functions
└── utils/                     # Test utilities and fixtures
    ├── __init__.py
    ├── fixtures.py            # Common test fixtures (mock app, db, etc.)
    └── mock_data.py           # Mock data generators
```

## Test Types

- **Integration Tests**: Verify that API endpoints and background processes work together (see `topic_model/test_topic_model_endpoint.py` and `test_topic_model_process.py`).
- **Unit Tests**: Test individual functions in isolation (see `topic_model/unit/test_utils.py`).
- **Fixtures & Mocks**: Shared fixtures and mock data for consistent, isolated testing (see `utils/fixtures.py` and `utils/mock_data.py`).

## Running Tests

### Local Development

- Run all tests:
  ```bash
  python -m pytest
  ```
- Run endpoint tests:
  ```bash
  python backend/test/run_endpoint_test.py
  ```
- Run with coverage:
  ```bash
  python backend/test/run_endpoint_test.py --coverage
  ```

### Docker Environment

Use the provided script:

```bash
# Run endpoint tests (default)
./run_docker_tests.sh

# Run with coverage
./run_docker_tests.sh --coverage

# Run a specific test file
./run_docker_tests.sh test/topic_model/unit/test_utils.py
```

See `./run_docker_tests.sh --help` for all options.

## Test Data

- **Dummy Data**: Static files in `dummy_data/` are used for process and integration tests.
- **Mock Data**: Utilities in `utils/mock_data.py` generate jobs, Reddit posts, and topic model results for tests.

## Fixtures

- **Global Fixtures**: `conftest.py` sets up environment variables, mocks problematic modules, and ensures log directories exist.
- **App & DB Mocks**: `utils/fixtures.py` provides fixtures for a mock Flask app, database session, and repositories.
- **Reddit API Mocks**: Both `conftest.py` and `fixtures.py` provide mock Reddit API objects for isolated testing.

## Logs & Coverage

- All logs and coverage reports are written to the `logs/` directory.
- Coverage HTML reports are generated in `logs/coverage_report/`.

## Environment

- Tests use mocked environment variables and in-memory SQLite by default.
- No real API keys or credentials are required for testing.

## Extending & Improving

- Add new unit tests in `topic_model/unit/`.
- Add new integration tests in `topic_model/`.
- Use or extend fixtures in `utils/fixtures.py` for new test scenarios.
- Use or extend mock data generators in `utils/mock_data.py`.

## Topic Model API Tests

This directory contains unit tests for the Topic Model API, particularly the `/analyze-async` endpoint and related functionality.

## Test Files

All topic model test files are located in the `topic_model/` directory:

- `topic_model/test_topic_model_endpoint.py`: Tests for the API endpoints (requires proper app context)
- `topic_model/test_topic_model_process.py`: Tests for the background processing functionality (requires proper app context)

## Log Files

All log files and reports are located in the `logs/` directory:

- `logs/test_logs/`: Contains test logs generated during testing
- `logs/coverage_report/`: Contains test coverage reports
- `logs/date_filter_test_logs/`: Contains logs related to date filtering tests

## Current Test Coverage

The tests aim to cover:

1. API endpoints for topic modeling
2. Background processing of topic modeling jobs
3. Job status and management
4. Reddit data fetching

## Environment Variables

The tests use mocked environment variables defined in `conftest.py` so you don't need to set up real API keys or credentials for testing.

## Future Improvements

To improve the testability of the codebase:

1. Tests should run as part of CI pipeline.
2. Refactor the code to reduce import dependencies between modules
3. Set up proper database fixtures for integration tests