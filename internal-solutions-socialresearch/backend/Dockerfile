FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements.txt /app/requirements.txt
# Install CPU-only torch first to avoid heavy CUDA wheels
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch==2.4.1+cpu \
 && pip install -r requirements.txt

# Copy application code
COPY . /app

EXPOSE 8081

CMD ["sh", "-lc", "python startup.py && gunicorn --bind 0.0.0.0:8081 --workers ${GUNICORN_WORKERS:-1} --timeout ${GUNICORN_TIMEOUT:-240} 'app:create_app()'"]
