# IA Next reader: Chromium for pages a plain fetch cannot read (JavaScript-built pages, cookie/age/disclaimer gates).
# No secrets, no data volume, no published port; see app.py and ia-next-local.compose.yml. Same base as ./render.
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pip install --no-cache-dir fastapi==0.115.12 uvicorn==0.34.2 playwright==1.56.0 \
 && python -m playwright install --with-deps chromium \
 && chmod -R a+rX /ms-playwright
WORKDIR /app
COPY app.py .
RUN useradd --create-home --uid 10003 reader
USER reader
EXPOSE 9510
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9510"]
