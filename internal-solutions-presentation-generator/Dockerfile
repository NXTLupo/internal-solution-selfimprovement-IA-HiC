FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including SVG processing libraries and OCR
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    curl \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libgdk-pixbuf-xlib-2.0-dev \
    libffi-dev \
    shared-mime-info \
    imagemagick \
    libmagickwand-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=600 --retries=10 -r requirements.txt || \
    pip install --no-cache-dir --timeout=600 --retries=10 -r requirements.txt || \
    pip install --no-cache-dir --timeout=600 --retries=10 --index-url https://pypi.org/simple -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads generated_content static templates

# Expose port
EXPOSE 5007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5007/health || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5007"]