# =============================================================
# ML Recommendation Service — Improved Dockerfile
# =============================================================

FROM python:3.12-slim AS runtime
WORKDIR /app

# Security: run as non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Install dependencies first (layer cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8001

# Health check using Python's built-in urllib (no extra tools needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

# Use multiple workers for production throughput
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2", "--log-level", "info"]
