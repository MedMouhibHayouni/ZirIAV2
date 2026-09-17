FROM python:3.11-slim

# Dépendances système minimales pour PyTorch/Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Créer le dossier pour les assets TFLite futurs
RUN mkdir -p assets

EXPOSE 8000

# Production : 4 workers Uvicorn derrière Gunicorn
# Timeout 120s pour l'inférence sur CPU (peut être lent au cold start)
CMD ["gunicorn", "main:app", \
     "-w", "4", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--log-level", "info"]
