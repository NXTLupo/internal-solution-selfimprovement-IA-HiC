# AI Journey Mapper (Claude 4) - Development Guidelines

## Enhanced Features
- **Claude Sonnet 4 Integration**: Latest model with 200K token analysis for maximum comprehensiveness
- **Extended Thinking Mode**: Deep systematic analysis with investigative thoroughness
- **Enhanced Journey Analysis**: Multi-stage systematic investigation with evidence-based insights
- **Investigative Approach**: Deep data mining and sophisticated insight extraction

## Commands
- **Run App**: `python run.py` (auto-selects available port from 8095, 8080, 5000, 3000, 9000)
- **Manual Start**: `uvicorn src.app:app --host=0.0.0.0 --port=8095 --reload`
- **Testing**: `python -m pytest tests/` (for running all tests) or `python -m pytest tests/test_file.py::test_function` (for single test)
- **Type Checking**: `mypy src/`
- **Lint**: `flake8 src/`

## Code Style
- **Imports**: Group imports (stdlib, third-party, local) with space between groups
- **Formatting**: 4-space indentation, 120 char line limit
- **Types**: Use Python type hints for function parameters and return values
- **Naming**: 
  - Snake_case for variables and functions (e.g., `data_processor`)
  - PascalCase for classes (e.g., `DynamicJourneyMapper`)
- **Error Handling**: Use try/except blocks with specific exceptions, log errors properly
- **Logging**: Use the custom logger from `src.utils.logger` for consistent logging

## Project Structure
- Keep code in the `src/` directory organized by component
- Store journey map outputs in `journey_maps/` 
- Store file uploads in `uploads/`