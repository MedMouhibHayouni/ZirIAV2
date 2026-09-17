# ─── Base image ──────────────────────────────────────────────────────────────
# python:3.10-slim keeps the image under 200 MB (vs ~900 MB for full python)
FROM python:3.10-slim

# ─── System dependencies for native libs (numpy, prophet) ────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# ─── Working directory ───────────────────────────────────────────────────────
WORKDIR /app

# ─── Python dependencies ─────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Application source ───────────────────────────────────────────────────────
COPY inference_server.py .

# ─── Model artefacts (optional — service runs in simulated mode if absent) ───
# Mount a volume at /app/models in production: -v ./models:/app/models
RUN mkdir -p /app/models

# ─── Environment defaults ─────────────────────────────────────────────────────
ENV MODELS_DIR=/app/models
ENV PORT=8000

# ─── Health check — Docker restarts the container if /health fails ────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

# ─── Run server ───────────────────────────────────────────────────────────────
# uvicorn with 2 workers; scale up via FLY_APP or Render env vars
CMD ["sh", "-c", "uvicorn inference_server:app --host 0.0.0.0 --port ${PORT} --workers 2"]
