# AI Soundtrack Generator Dockerfile
# NXT Humans Intelligence Augmentation Suite

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for audio/video processing
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    libsndfile1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads generated static/css static/js templates

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5009/health || exit 1

# Expose port
EXPOSE 5009

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5009"]