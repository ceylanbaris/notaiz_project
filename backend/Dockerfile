FROM python:3.11-slim

# librosa/soundfile icin sistem bagimliliklari
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HF Spaces 7860 portu bekler
EXPOSE 7860

# HF Spaces'te /tmp yazilabilir, uploads oraya
ENV UPLOAD_DIR=/tmp/notaiz/uploads

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
