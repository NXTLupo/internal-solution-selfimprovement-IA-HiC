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

# Copy startup script
COPY start_with_correct_key.sh /app/start_with_correct_key.sh
RUN chmod +x /app/start_with_correct_key.sh

# Create necessary directories
RUN mkdir -p logs uploads transcripts temp static

# Expose port
EXPOSE 5000

# Run the application with correct API key
CMD ["/bin/bash", "/app/start_with_correct_key.sh"]
