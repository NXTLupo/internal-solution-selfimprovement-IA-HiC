ARG PYTHON_VER=3.11
FROM python:${PYTHON_VER} AS backend
WORKDIR /app
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip

# Install CPU-only PyTorch before other requirements
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install other requirements but skip PyTorch (pip will see it's already installed)
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "-m", "run"]