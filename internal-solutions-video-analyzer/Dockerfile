FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ .

# Create necessary directories
RUN mkdir -p logs uploads transcripts temp static

# Expose port
EXPOSE 5000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
