# AI Journey Mapper - Detailed Setup Guide

This guide provides detailed instructions for setting up and running the AI Journey Mapper application.

## Prerequisites

- Python 3.10 or higher
- Node.js 14 or higher and npm
- Ollama installed locally (for macOS: `brew install ollama`)
- Git

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/AI_Journey_Mapper.git
cd AI_Journey_Mapper
```

## Step 2: Set Up Python Environment

Create and activate a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

## Step 3: Set Up Ollama

Start the Ollama server:

```bash
ollama serve
```

In a new terminal window, pull the Gemma model:

```bash
ollama pull gemma:7b
```

Verify the model is installed:

```bash
ollama list
```

You should see `gemma:7b` in the list of available models.

## Step 4: Set Up the React Frontend

Install Node.js dependencies:

```bash
npm install
```

Build the React application:

```bash
npm run build
```

This will create the compiled JavaScript files in the `static/js` directory.

## Step 5: Update the Streamlit App

Review the changes in `app_updates.py` and update your `src/app.py` file accordingly. This file contains modifications needed to integrate the React frontend with the Streamlit backend.

```bash
# You can manually review and apply the changes, or use a tool like:
cat app_updates.py | pbcopy  # On macOS, copies to clipboard
```

## Step 6: Run the Application

Start the Streamlit application:

```bash
streamlit run src/app.py
```

The application should now be running and accessible at `http://localhost:8501`.

## Development Workflow

### Frontend Development

For active frontend development, run webpack in watch mode:

```bash
npm run dev
```

This will automatically rebuild the JavaScript bundle whenever you make changes to the React code.

### Backend Development

For backend changes, you just need to restart the Streamlit app after making changes:

```bash
streamlit run src/app.py
```

Streamlit has hot-reloading enabled by default, so most changes will be reflected immediately without needing to restart the server.

## Troubleshooting

### Common Issues

1. **Error: Ollama not found**
   - Make sure Ollama is installed and running with `ollama serve`
   - Check the Ollama service status

2. **Error: Model not found**
   - Ensure you've pulled the required model with `ollama pull gemma:7b`
   - Verify it's available with `ollama list`

3. **React components not loading**
   - Check if the build process completed successfully
   - Look for errors in the webpack output
   - Verify the JavaScript files are generated in `static/js`
   - Check browser console for JavaScript errors

4. **FastAPI endpoints not working**
   - Ensure the FastAPI app is correctly mounted in the Streamlit app
   - Check for any errors in the Streamlit console output

### Getting Help

If you encounter any issues not covered here, please:
1. Check the GitHub repository issues section
2. Open a new issue with detailed information about the problem
3. Include information about your environment and the error messages you're seeing