/* ── Home Page — Upload Zone & Hero ── */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Fingerprint, Sparkles, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import UploadZone from '../components/UploadZone';
import { createAnalysisWithWakeup, getStoredToken } from '../services/api';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } },
};

const features = [
  {
    icon: Music,
    iconClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
    borderClass: 'border-indigo-500/15',
    title: 'Dört Katmanlı Sinyal Analizi',
    desc: 'Chroma, HPCP, Tempogram ve Ses Parmak İzi sinyalleri eş zamanlı işlenir. Melodik, harmonik, ritmik ve yapısal benzerlik ayrı ayrı ölçülür; hiçbir katman gözden kaçmaz.',
  },
  {
    icon: Brain,
    iconClass: 'text-violet-400',
    bgClass: 'bg-violet-500/10 group-hover:bg-violet-500/20',
    borderClass: 'border-violet-500/15',
    title: 'Gemini ile Yapay Zeka Yorumu',
    desc: 'Ham metrik değerleri Gemini tarafından müzikal bağlama oturtulur. Güven skoru ve açıklamalı kategori kararı üretilir; rakamlar anlamlı bir yoruma dönüşür.',
  },
  {
    icon: Fingerprint,
    iconClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10 group-hover:bg-purple-500/20',
    borderClass: 'border-purple-500/15',
    title: 'Yapısal Öncelikli Değerlendirme',
    desc: 'Ses parmak izi eşleşmesi belirleyici metriktir. Yüksek melodik/harmonik skor tek başına intihal göstergesi değildir — sistem bu ayrımı açıkça raporlar.',
  },
];

export default function Home() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Yükleniyor...');
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
    setLoadingMsg('Yükleniyor...');
    try {
      const { analysis_id } = await createAnalysisWithWakeup(fileA, fileB, setLoadingMsg);
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
      setLoadingMsg('Yükleniyor...');
    }
  }, [fileA, fileB, navigate]);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="section-container"
    >
      {/* ── Hero ── */}
      <div className="text-center max-w-3xl mx-auto pt-12 pb-14">
        {/* Badge */}
        <motion.div variants={fadeUp} className="mb-5">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Sparkles size={13} />
            TÜBİTAK 2209-A Projesi
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-5"
        >
          Şarkı Benzerlik Analizi
          <br />
          <span className="gradient-text">Çok Katmanlı · AI Destekli</span>
        </motion.h1>

        {/* Signal pills */}
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2 mb-6">
          <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
            Melodik
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
            Harmonik
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-medium">
            Ritmik
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
            Yapısal
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-violet-500/15 text-violet-200 border border-violet-500/25 font-semibold">
            <Brain size={10} />
            Gemini AI
          </span>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto"
        >
          İki ses dosyasını melodik, harmonik, ritmik ve yapısal açıdan{' '}
          <span className="text-slate-300 font-medium">dört bağımsız sinyal</span> ile analiz eder.
          Sonuçları Gemini yapay zekası müzikal bağlama oturtarak güven skoruyla yorumlar.
        </motion.p>
      </div>

      {/* ── Upload Section ── */}
      <motion.div variants={fadeUp} className="max-w-2xl mx-auto mb-14">
        {/* Glow halo */}
        <div className="relative">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-violet-500/12 via-purple-500/8 to-indigo-500/12 blur-2xl pointer-events-none" />
          <div className="relative glass-card p-8 space-y-6 border-purple-500/15 shadow-2xl shadow-purple-500/10">
            <div className="text-center mb-2">
              <h2 className="text-lg font-display font-bold tracking-tight text-white">
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
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
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
                  {loadingMsg}
                </>
              ) : (
                <>
                  Analiz Et
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Features ── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14 max-w-4xl mx-auto"
      >
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className={`glass-card p-6 text-center group border ${f.borderClass} shadow-lg hover:shadow-xl hover:shadow-purple-500/8 transition-shadow duration-300`}
            >
              <div
                className={`w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors duration-200 ${f.bgClass}`}
              >
                <Icon size={22} className={f.iconClass} />
              </div>
              <h3 className="text-sm font-bold tracking-tight text-white mb-2">{f.title}</h3>
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
