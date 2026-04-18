/* ── Home Page — Upload Zone & Hero ── */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, AudioWaveform, Shield, Zap, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import UploadZone from '../components/UploadZone';
import { createAnalysis, getStoredToken } from '../services/api';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } },
};

export default function Home() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const canAnalyze = fileA !== null && fileB !== null && !loading;

  const handleAnalyze = useCallback(async () => {
    if (!fileA || !fileB) return;

    const token = getStoredToken();
    if (!token) {
      toast.error('Analiz başlatmak için giriş yapmanız gerekiyor');
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { analysis_id } = await createAnalysis(fileA, fileB);
      navigate(`/analysis/${analysis_id}`);
    } catch (err: any) {
      const rawDetail = err?.response?.data?.detail;
      let msg: string;
      if (Array.isArray(rawDetail)) {
        msg = rawDetail.map((e: any) => e.msg ?? JSON.stringify(e)).join('; ');
      } else if (typeof rawDetail === 'string') {
        msg = rawDetail;
      } else if (err?.response?.status) {
        msg = `Sunucu hatası (${err.response.status})`;
      } else if (err?.message) {
        msg = `Bağlantı hatası: ${err.message}`;
      } else {
        msg = 'Analiz başlatılamadı';
      }
      console.error('[createAnalysis]', err?.response?.status, err?.message, err?.response?.data);
      toast.error(msg);
      setLoading(false);
    }
  }, [fileA, fileB, navigate]);

  const features = [
    {
      icon: AudioWaveform,
      title: 'Çoklu Metrik Analiz',
      desc: 'MFCC, CQT-Chroma, HPCP ve Tempogram tabanlı kapsamlı özellik çıkarımı',
    },
    {
      icon: Shield,
      title: 'Güvenilir Risk Değerlendirmesi',
      desc: 'ROC/PR eğrileri ile kalibre edilmiş eşik ve belirsizlik göstergesi',
    },
    {
      icon: Zap,
      title: 'Hızlı İşleme',
      desc: '30 saniyelik iki parça için medyan 500ms altında karşılaştırma',
    },
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="section-container"
    >
      {/* ── Hero ── */}
      <div className="text-center max-w-3xl mx-auto pt-12 pb-16">
        <motion.div variants={fadeUp} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Sparkles size={14} />
            TÜBİTAK 2209-A Projesi
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6"
        >
          Şarkı Benzerlik Analizi
          <br />
          <span className="gradient-text">Hızlı & Güvenilir</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto"
        >
          İki ses dosyası arasındaki teknik benzerliği ölçün. Cosine, DTW ve korelasyon
          füzyonu ile kalibre edilmiş sonuçlar alın.
        </motion.p>
      </div>

      {/* ── Upload Section ── */}
      <motion.div variants={fadeUp} className="max-w-2xl mx-auto">
        <div className="glass-card p-8 space-y-6">
          <div className="text-center mb-2">
            <h2 className="text-lg font-display font-semibold text-white">
              Dosyalarınızı Yükleyin
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Karşılaştırmak istediğiniz iki ses dosyasını seçin
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <UploadZone
              label="Dosya A (Orijinal)"
              file={fileA}
              onFileDrop={setFileA}
              onRemove={() => setFileA(null)}
            />
            <UploadZone
              label="Dosya B (Karşılaştırma)"
              file={fileB}
              onFileDrop={setFileB}
              onRemove={() => setFileB(null)}
            />
          </div>

          <button
            id="analyze-btn"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-3.5 !text-base"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Yükleniyor...
              </>
            ) : (
              <>
                Analiz Et
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── Features ── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 mb-16 max-w-4xl mx-auto"
      >
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="glass-card p-6 text-center group"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                <Icon size={24} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Disclaimer ── */}
      <motion.div variants={fadeUp} className="max-w-2xl mx-auto mb-16">
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-center">
          <p className="text-xs text-amber-300/80 leading-relaxed">
            ⚠️ Bu sistem yalnızca teknik benzerlik sinyali üretir; telif hukuku kararı
            niteliği taşımaz. Sonuçlar erken uyarı ve ön eleme amaçlıdır.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
