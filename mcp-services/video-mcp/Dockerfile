FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV VIDEO_ANALYZER_URL=http://video-analyzer:5000

# Expose port
EXPOSE 8004

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8004"]