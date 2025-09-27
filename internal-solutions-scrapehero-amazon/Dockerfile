FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Set entrypoint and default command
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]
