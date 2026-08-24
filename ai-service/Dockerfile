FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files to disc
ENV PYTHONDONTWRITEBYTECODE 1
# Prevent Python from buffering stdout and stderr
ENV PYTHONUNBUFFERED 1

ENV SENTENCE_TRANSFORMERS_HOME /app/.cache

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Pre-download SentenceTransformer model to cache in Docker layer
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY ./app ./app

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
