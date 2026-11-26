# IA Next renderer: Chromium for the prototype design review (plan P5). No secrets, no data, no internet route;
# see app.py and ia-next.compose.yml (internal network ia-next-render, no published port).
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pip install --no-cache-dir fastapi==0.115.12 uvicorn==0.34.2 playwright==1.56.0 \
 && python -m playwright install --with-deps chromium \
 && chmod -R a+rX /ms-playwright
WORKDIR /app
COPY app.py .
RUN useradd --create-home --uid 10002 render
USER render
EXPOSE 9500
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9500"]
