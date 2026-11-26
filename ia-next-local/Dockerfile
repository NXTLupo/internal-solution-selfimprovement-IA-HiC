FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ia_next ./ia_next
COPY web ./web
RUN useradd --create-home --uid 10001 ianext && mkdir -p /data && chown ianext /data
USER ianext
EXPOSE 9460
CMD ["uvicorn", "ia_next.app:app", "--host", "0.0.0.0", "--port", "9460"]
