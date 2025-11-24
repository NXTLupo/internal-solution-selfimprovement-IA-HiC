# Multi-stage build for Research Generator

# Stage 1: Build the React application
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files and build the application
COPY . .
RUN npm run build

# Stage 2: Production image with Flask server
FROM python:3.9-slim

WORKDIR /app

# Install Flask and dependencies
RUN pip install --no-cache-dir flask==2.3.3 flask-cors==4.0.0 gunicorn==21.2.0

# Copy the built React app from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the Flask app and other necessary files
COPY app.py .
COPY requirements.txt .

# Expose port
EXPOSE 5011

# Start the Flask server
CMD ["python", "app.py"]