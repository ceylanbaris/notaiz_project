# Notaiz — Web Tabanlı Şarkı Benzerlik ve Telif Risk Analizi Sistemi
## Claude Code Uygulama Spesifikasyonu

---

## 1. Proje Özeti

**Notaiz**, iki ses dosyası arasındaki teknik benzerliği güvenilir ve tekrarlanabilir biçimde ölçen web tabanlı bir uygulamadır. Sistem hukuki hüküm üretmez; erken uyarı ve ön eleme işlevi görür. Kullanıcıya kalibre edilmiş benzerlik skoru, belirsizlik göstergesi ve görsel hizalama haritası sunar.

**Ekip:** Barış CEYLAN, Mehmet Emin UÇAN  
**Danışman:** Doç. Dr. Levent ÇALLI  
**Kurum:** Sakarya Üniversitesi — Bilişim Sistemleri Mühendisliği  
**Program:** TÜBİTAK 2209-A

---

## 2. Teknoloji Yığını

### Backend
- **Python 3.11+**
- **FastAPI** — REST API sunucusu
- **Librosa** — ses özellik çıkarımı
- **NumPy / SciPy** — sayısal işlemler ve DTW
- **scikit-learn** — normalizasyon, metrik hesaplama
- **MSSQL** (veya PostgreSQL) — kalıcı depolama (öznitelikler, raporlar)
- **SQLAlchemy** — ORM
- **Celery + Redis** — uzun süren analizlerin asenkron işlenmesi (opsiyonel faz 2)
- **pydantic** — veri doğrulama

### Frontend
- **React 18** (Vite)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** — spektrogram / hizalama görselleştirme
- **Axios** — API iletişimi
- **React Query** — sunucu state yönetimi

### Altyapı
- **Docker + Docker Compose** — geliştirme ortamı
- Deployment: Render veya Railway (plan B)

---

## 3. Klasör Yapısı

```
notaiz/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── analysis.py      # /analyze endpoint
│   │   │   │   ├── reports.py       # /reports endpoint
│   │   │   │   └── health.py        # /health endpoint
│   │   ├── core/
│   │   │   ├── config.py            # Ayarlar (env variables)
│   │   │   └── database.py          # DB bağlantısı
│   │   ├── models/
│   │   │   ├── analysis.py          # SQLAlchemy modelleri
│   │   │   └── schemas.py           # Pydantic şemaları
│   │   ├── services/
│   │   │   ├── audio_processor.py   # Ön işleme pipeline
│   │   │   ├── feature_extractor.py # MFCC, CQT, HPCP, tempogram
│   │   │   ├── similarity_engine.py # Cosine, DTW, korelasyon füzyonu
│   │   │   ├── report_generator.py  # PDF rapor oluşturma
│   │   │   └── thresholds.py        # ROC/PR eşik yönetimi
│   │   └── utils/
│   │       ├── file_handler.py      # Geçici dosya yönetimi
│   │       └── validators.py        # Dosya format/boyut kontrolü
│   ├── tests/
│   │   ├── test_feature_extractor.py
│   │   ├── test_similarity_engine.py
│   │   └── test_api.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx       # Drag & drop ses yükleme
│   │   │   ├── SimilarityGauge.tsx  # Benzerlik skoru göstergesi
│   │   │   ├── AlignmentMap.tsx     # Görsel hizalama haritası
│   │   │   ├── WaveformCompare.tsx  # Dalga formu karşılaştırma
│   │   │   ├── SpectrogramView.tsx  # Spektrogram görüntüsü
│   │   │   ├── RiskBadge.tsx        # Düşük/Orta/Yüksek risk etiketi
│   │   │   └── ReportCard.tsx       # Sonuç raporu kartı
│   │   ├── pages/
│   │   │   ├── Home.tsx             # Ana sayfa — yükleme alanı
│   │   │   ├── Analysis.tsx         # Analiz sayfası (canlı ilerleme)
│   │   │   ├── Results.tsx          # Sonuç ve görselleştirme sayfası
│   │   │   └── History.tsx          # Geçmiş analizler
│   │   ├── services/
│   │   │   └── api.ts               # API çağrı fonksiyonları
│   │   ├── hooks/
│   │   │   └── useAnalysis.ts       # Analiz state hook'u
│   │   └── types/
│   │       └── index.ts             # TypeScript tip tanımları
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 4. API Endpoints

### `POST /api/v1/analyze`
İki ses dosyası karşılaştırması başlatır.

**Request:** `multipart/form-data`
- `file_a`: ses dosyası (mp3, wav, flac — max 50MB)
- `file_b`: ses dosyası (mp3, wav, flac — max 50MB)

**Response:**
```json
{
  "analysis_id": "uuid",
  "status": "processing" | "completed" | "failed",
  "similarity_score": 0.72,
  "uncertainty": 0.08,
  "risk_level": "medium",
  "metrics": {
    "cosine_similarity": 0.75,
    "dtw_distance_normalized": 0.68,
    "correlation": 0.73,
    "fused_score": 0.72
  },
  "alignment_map": [[0.0, 0.0], [1.2, 1.1], ...],
  "disclaimer": "Bu sonuç teknik benzerlik sinyalidir; telif hukuku kararı değildir.",
  "processing_time_ms": 412
}
```

### `GET /api/v1/reports/{analysis_id}`
Geçmiş analiz sonucunu döndürür.

### `GET /api/v1/reports/{analysis_id}/pdf`
Analiz raporunu PDF olarak indirir.

### `GET /api/v1/health`
Servis sağlık durumu.

---

## 5. İşleme Pipeline (Backend)

### 5.1 Dosya Doğrulama
- Format kontrolü: mp3, wav, flac, ogg
- Maksimum boyut: 50MB
- Minimum süre: 5 saniye
- İşlem sonrası geçici dosyaların silinmesi (TTL: 1 saat)

### 5.2 Ön İşleme (`audio_processor.py`)
```
1. Mono dönüşümü (stereo → tek kanal)
2. Yeniden örnekleme → 22050 Hz (sabit)
3. Ses şiddeti normalleştirme (peak normalization)
4. Baş/son sessizlik kırpma (top_db=20)
5. Sabit pencere parametreleri: n_fft=2048, hop_length=512
```

### 5.3 Özellik Çıkarımı (`feature_extractor.py`)
| Özellik | Amaç | Kütüphane |
|---|---|---|
| MFCC (13 katsayı) | Timbral içerik | librosa |
| Log-Mel Spectrogram | Genel ses dokusu | librosa |
| CQT-Chroma | Armonik içerik, transpozisyon dayanıklılığı | librosa |
| HPCP | Pitch sınıf profili | librosa / custom |
| Tempogram | Ritmik örüntü | librosa |

Tüm özellik vektörleri L2 normalizasyonuna tabi tutulur.

### 5.4 Benzerlik Hesabı (`similarity_engine.py`)
```python
# 1. Cosine Similarity (MFCC + Mel üzerinde)
cosine_score = cosine_similarity(feat_a.mean(axis=1), feat_b.mean(axis=1))

# 2. Beat-synchronous DTW (Chroma üzerinde)
dtw_score = 1 - normalized_dtw_distance(chroma_a_beat, chroma_b_beat)

# 3. Pearson Korelasyonu (tempogram üzerinde)
corr_score = pearson_correlation(tempogram_a, tempogram_b)

# 4. Füzyon (ağırlıklı ortalama — geliştirme kümesinde optimize edilir)
fused = 0.40 * cosine_score + 0.40 * dtw_score + 0.20 * corr_score
```

### 5.5 Eşik ve Risk Sınıflandırması
- Eşikler geliştirme kümesi üzerinde ROC/PR analizi ile belirlenir
- **Düşük risk:** fused < 0.45
- **Orta risk:** 0.45 ≤ fused < 0.70
- **Yüksek risk:** fused ≥ 0.70
- Belirsizlik göstergesi: metrikler arası standart sapma

### 5.6 Raporlama
- PDF çıktısında: benzerlik skoru, risk seviyesi, hizalama haritası, dalga formu karşılaştırması, yasal uyarı
- Yasal uyarı metni (her çıktıda zorunlu): *"Bu rapor yalnızca teknik benzerlik sinyali içermektedir; telif hukuku kararı niteliği taşımaz."*

---

## 6. Veri Tabanı Şeması

```sql
-- Analiz kayıtları
CREATE TABLE analyses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMP DEFAULT NOW(),
    status       VARCHAR(20),          -- processing, completed, failed
    file_a_hash  VARCHAR(64),          -- SHA-256 (gizlilik için ham ses saklanmaz)
    file_b_hash  VARCHAR(64),
    duration_a   FLOAT,
    duration_b   FLOAT,
    fused_score  FLOAT,
    risk_level   VARCHAR(10),
    metrics_json JSONB,
    alignment_json JSONB,
    processing_ms INTEGER
);

-- Öznitelik önbelleği (aynı şarkı tekrar yüklenince yeniden hesaplamayı önler)
CREATE TABLE feature_cache (
    file_hash    VARCHAR(64) PRIMARY KEY,
    features_json JSONB,
    created_at   TIMESTAMP DEFAULT NOW(),
    expires_at   TIMESTAMP
);
```

---

## 7. Frontend Sayfa Akışı

```
Ana Sayfa (Home)
    └── İki ses dosyası yükle (drag & drop veya dosya seçici)
    └── "Analiz Et" butonu
        │
        ▼
Analiz Sayfası (Analysis)
    └── Gerçek zamanlı ilerleme çubuğu (SSE veya polling)
    └── Adım göstergesi: Yüklendi → Ön İşleme → Özellik Çıkarımı → Karşılaştırma → Hazır
        │
        ▼
Sonuç Sayfası (Results)
    ├── Büyük benzerlik skoru (% olarak) + risk seviyesi rozeti
    ├── Belirsizlik aralığı göstergesi
    ├── Hizalama haritası (ısı haritası)
    ├── Dalga formu karşılaştırması (yan yana)
    ├── Metrik detayları (cosine, DTW, korelasyon)
    ├── PDF rapor indirme butonu
    └── Yasal uyarı banner'ı (her zaman görünür)
        │
        ▼
Geçmiş (History)
    └── Önceki analizlerin listesi ve erişim
```

---

## 8. Performans Hedefleri

| Metrik | Hedef |
|---|---|
| 30 sn'lik iki parça karşılaştırması medyan gecikme | ≤ 500ms |
| p95 gecikme | ≤ 900ms |
| Bellek kullanımı (tek analiz) | Ölçülüp raporlanacak |
| AUC (sınıflama) | ≥ 0.85 |
| F1 skoru | ≥ 0.75 |

---

## 9. Değerlendirme ve Test Altyapısı

### Veri Kümesi Yapısı
- Cover çiftleri (bilinen benzer parçalar)
- Yakın motif içeren çiftler
- İlgisiz çiftler (negatif örnekler)
- Tür dengeli dağılım

### Metrikler
- Sınıflama: AUC, F1, Precision-Recall eğrisi
- Sıralama: MAP, nDCG@10
- Güven aralığı: 5-katlı çapraz doğrulama + bootstrap

### Karşılaştırma Temel Çizgileri (Baseline)
1. Klasik parmak izi (fingerprinting) + benzerlik füzyonu
2. Derin temsil tabanlı gömlemeler (transformer mimarisi)

### Test Betikleri
- `tests/eval/run_baseline.py` — temel çizgi karşılaştırma
- `tests/eval/run_crossval.py` — çapraz doğrulama
- `tests/eval/benchmark_latency.py` — gecikme ölçümü

---

## 10. Etik ve Gizlilik Kuralları

- Ham ses dosyaları kalıcı olarak **saklanmaz**; işlem tamamlandıktan sonra silinir (TTL: 1 saat)
- Kalıcı depolamada yalnızca türetilmiş öznitelikler tutulur
- Dosya kimliği SHA-256 hash ile tutulur (içerik değil)
- Kullanıcıya erişim ve silme politikaları dokümante edilir
- Tüm çıktılarda yasal uyarı zorunludur

---

## 11. Geliştirme Takvimi

| Dönem | Görev | Sorumlu |
|---|---|---|
| Ay 1 (Kasım 2025) | Literatür, metodoloji seçimi, proje kurulumu | Barış |
| Ay 2 (Aralık 2025) | FastAPI backend, özellik çıkarım pipeline | Mehmet Emin |
| Ay 3 (Ocak 2026) | React frontend, DB entegrasyonu, dosya yükleme | Barış |
| Ay 4 (Şubat 2026) | Benzerlik motoru, füzyon, eşik kalibrasyonu | Ekip |
| Ay 5-6 (Mart–Nisan 2026) | Test, baseline karşılaştırma, sonuç raporu | Ekip |

---

## 12. Açık Kaynak Yayın Planı

- Tüm deney betikleri GitHub'da yayımlanacak
- Deney sürümleme için DVC veya MLflow kullanılacak
- Türkçe şarkı arşivi veri tabanı ilerleyen fazda eklenmesi planlanıyor
- README ve teknik dokümantasyon Türkçe + İngilizce olacak

---

## 13. Başlangıç İçin Öncelikli Görevler (Claude Code İçin)

Projeyi aşağıdaki sırayla inşa et:

1. **Docker Compose** ortamını kur (backend + frontend + DB servisleri)
2. **FastAPI** iskeletini oluştur (`main.py`, CORS, temel route yapısı)
3. **`audio_processor.py`** — librosa tabanlı ön işleme pipeline'ı
4. **`feature_extractor.py`** — MFCC, CQT-Chroma, HPCP, Tempogram çıkarımı
5. **`similarity_engine.py`** — cosine + DTW + korelasyon füzyonu
6. **`/api/v1/analyze`** endpoint'ini bağla ve test et
7. **React frontend** — UploadZone, analiz sayfası, sonuç görselleştirme
8. **PDF rapor** oluşturucu
9. **Değerlendirme betikleri** — AUC, F1, gecikme ölçümü

---

*Bu spec dosyası TÜBİTAK 2209-A başvurusu (Notaiz projesi) baz alınarak Claude Code uygulaması için hazırlanmıştır.*
