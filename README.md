markdown# Notaiz — Müzik Benzerlik ve Cover Tespit Sistemi

İki ses dosyası arasındaki müzikal benzerliği ölçen, 
cover/aranjman ve potansiyel intihal tespiti yapan 
hibrit analiz sistemi. TÜBİTAK 2209-A destekli bitirme 
projesi.

## Mimari
- **Frontend:** React + Vite + TypeScript (Vercel)
- **Backend:** FastAPI + librosa (Hugging Face Spaces)
- **Veritabanı:** Supabase (PostgreSQL)
- **LLM:** Google Gemini

## Yöntem
Dört bağımsız metrik hesaplanır:
- **Melodik** — Chroma CQT
- **Ritmik** — Tempogram
- **Harmonik** — HPCP
- **Yapısal** — Audio Fingerprinting (Shazam-tarzı)

Kural tabanlı karar ağacı kategoriyi belirler; 
büyük dil modeli Türkçe açıklama üretir.

## Kurulum

### Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

### Frontend
cd frontend
npm install
npm run dev

`.env` dosyası gizli tutulur, depoya dahil değildir.

## Geliştiriciler
- Barış Ceylan
- Mehmet Emin Uçan

**Danışman:** Doç. Dr. Levent Çallı
