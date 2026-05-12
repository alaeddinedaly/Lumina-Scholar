FROM python:3.10-slim

WORKDIR /app

# Copy requirements
COPY apps/workers/requirements.txt ./apps/workers/

# Install dependencies
WORKDIR /app/apps/workers
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
WORKDIR /app
COPY apps/workers ./apps/workers

# We will let the container run from the worker directory
WORKDIR /app/apps/workers

CMD ["python", "main.py"]
