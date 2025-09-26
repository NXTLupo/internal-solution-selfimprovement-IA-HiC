# Multi-stage build for React + Flask application
FROM node:20-alpine AS frontend-builder

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy package files
COPY package*.json ./

# Fix ARM64 Rollup issue - clear npm cache and install with npm install
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json && \
    npm install

# Copy source files
COPY . .

# Build the React application with retry mechanism for ARM64 compatibility
RUN npm run build || (npm cache clean --force && npm install && npm run build)

# Python backend stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask application
COPY app.py .

# Copy built frontend from the builder stage
COPY --from=frontend-builder /app/frontend/dist ./dist

# Copy static files (favicon, etc.)
COPY static ./static

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 5010

# Environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PORT=5010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5010/health || exit 1

# Start the application
CMD ["gunicorn", "--bind", "0.0.0.0:5010", "--workers", "2", "--timeout", "120", "app:app"]