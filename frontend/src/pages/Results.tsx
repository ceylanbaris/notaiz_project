/* ── Results Page — Full Analysis Report ── */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download,
  ArrowLeft,
  FileAudio,
  Clock,
  Timer,
  AlertTriangle,
  Info,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { getAnalysis, getAnalysisPdfUrl } from '../services/api';
import type { Analysis, CategoryType } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';
import SimilarityGauge from '../components/SimilarityGauge';
import MetricChart from '../components/MetricChart';
import AlignmentMap from '../components/AlignmentMap';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CategoryIcon = React.ComponentType<any>;

const CATEGORY_ICONS: Record<CategoryType, CategoryIcon> = {
  low_similarity:      ShieldCheck,
  moderate_similarity: Shield,
  high_similarity:     ShieldAlert,
  cover_or_same:       AlertTriangle,
};

function CategoryBadge({ category }: { category: string }) {
  const cat = (category || 'moderate_similarity') as CategoryType;
  const color = CATEGORY_COLORS[cat] ?? '#f59e0b';
  const label = CATEGORY_LABELS[cat] ?? category;
  const Icon  = CATEGORY_ICONS[cat] ?? Shield;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 rounded-full font-semibold border px-5 py-2.5 text-base"
      style={{ color, borderColor: `${color}33`, backgroundColor: `${color}10` }}
    >
      <Icon size={20} />
      {label}
    </motion.div>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAnalysis(id)
      .then((data) => {
        setAnalysis(data);
        if (data.status === 'processing') {
          navigate(`/analysis/${id}`, { replace: true });
        }
      })
      .catch(() => setError('Analiz sonuçları yüklenemedi'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="section-container flex items-center justify-center min-h-[70vh]">
        <div className="glass-card p-10 text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="section-container flex items-center justify-center min-h-[70vh]">
        <div className="glass-card p-10 text-center">
          <AlertTriangle size={32} className="mx-auto text-red-400 mb-4" />
          <p className="text-sm text-red-300 mb-4">{error || 'Analiz bulunamadı'}</p>
          <Link to="/" className="btn-secondary !text-sm">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  const riskLevel  = analysis.risk_level || 'low';
  const category   = analysis.category   || 'moderate_similarity';
  const catColor   = CATEGORY_COLORS[category as CategoryType] ?? '#f59e0b';
  const hasLLM     = !!(analysis.explanation_tr || analysis.key_observation);

  const confidencePct = analysis.confidence > 0 ? Math.round(analysis.confidence * 100) : null;
  const confidenceLabel =
    analysis.confidence >= 0.8 ? 'Yüksek' : analysis.confidence >= 0.5 ? 'Orta' : 'Düşük';
  const confidenceColor =
    analysis.confidence >= 0.8 ? '#22c55e' : analysis.confidence >= 0.5 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="section-container pb-16"
    >
      {/* Back */}
      <motion.div variants={fadeUp} className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Ana Sayfa
        </button>
      </motion.div>

      {/* Header + Score */}
      <motion.div variants={fadeUp} className="glass-card p-8 mb-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Gauge */}
          <div className="flex-shrink-0">
            <SimilarityGauge
              score={analysis.fused_score ?? 0}
              risk={riskLevel as any}
              size={200}
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-4">
              <CategoryBadge category={category} />
            </div>
            <h1 className="text-2xl font-display font-bold text-white mb-4">
              Analiz Sonuçları
            </h1>

            {/* File names */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <FileAudio size={16} className="text-indigo-400" />
                <span className="text-sm text-slate-300 truncate">
                  {analysis.file_a_name || 'Dosya A'}
                </span>
                {analysis.duration_a && (
                  <span className="text-xs text-slate-500">
                    ({analysis.duration_a.toFixed(1)}s)
                  </span>
                )}
              </div>
              <span className="text-sm text-slate-500 self-center">vs</span>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <FileAudio size={16} className="text-purple-400" />
                <span className="text-sm text-slate-300 truncate">
                  {analysis.file_b_name || 'Dosya B'}
                </span>
                {analysis.duration_b && (
                  <span className="text-xs text-slate-500">
                    ({analysis.duration_b.toFixed(1)}s)
                  </span>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(analysis.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {analysis.processing_ms && (
                <span className="flex items-center gap-1">
                  <Timer size={12} />
                  {analysis.processing_ms}ms
                </span>
              )}
              {analysis.uncertainty !== null && analysis.uncertainty !== undefined && (
                <span className="flex items-center gap-1">
                  <Info size={12} />
                  Belirsizlik: ±{(analysis.uncertainty * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {/* PDF Download */}
            {id && (
              <div className="mt-6">
                <a
                  href={getAnalysisPdfUrl(id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2 !text-sm"
                >
                  <Download size={16} />
                  PDF Rapor İndir
                </a>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Metrics Chart */}
      {analysis.metrics && (
        <motion.div variants={fadeUp} className="glass-card p-6 mb-6">
          <h2 className="text-base font-display font-semibold text-white mb-4">
            Metrik Detayları
          </h2>
          <MetricChart metrics={analysis.metrics} />
        </motion.div>
      )}

      {/* How it works — collapsible */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setHowOpen((o) => !o)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info size={15} className="text-indigo-400" />
              <span className="text-sm font-semibold text-white">Bu analiz nasıl yapıldı?</span>
            </div>
            <ChevronDown
              size={15}
              className="text-slate-400 transition-transform duration-200"
              style={{ transform: howOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
          {howOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-5 pb-5 border-t border-white/10"
            >
              <p className="text-sm text-slate-300 leading-relaxed pt-4">
                Notaiz, dört bağımsız sinyali birleştiren hibrit bir mimari kullanır:{' '}
                <span className="text-indigo-300 font-medium">Chroma</span> (melodik),{' '}
                <span className="text-purple-300 font-medium">HPCP</span> (harmonik),{' '}
                <span className="text-violet-300 font-medium">Tempogram</span> (ritmik) ve{' '}
                <span className="text-indigo-400 font-medium">Audio Fingerprinting</span> (yapısal).
                Bu metrikler büyük dil modeli (Gemini) ile yorumlanarak kategorik bir sonuca
                dönüştürülür. Sistem teknik benzerlik sinyali üretir.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* LLM Interpretation */}
      {hasLLM && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* AI Assessment */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: catColor }} />
              <h2 className="text-base font-display font-semibold text-white">
                AI Değerlendirmesi
              </h2>
            </div>

            {analysis.category_label_tr && (
              <p
                className="text-xl font-bold mb-2"
                style={{ color: catColor }}
              >
                {analysis.category_label_tr}
              </p>
            )}

            {confidencePct !== null && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-500">Analiz güveni:</span>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    color: confidenceColor,
                    backgroundColor: `${confidenceColor}20`,
                    border: `1px solid ${confidenceColor}40`,
                  }}
                >
                  {confidenceLabel} — %{confidencePct}
                </span>
              </div>
            )}

            {analysis.explanation_tr && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {analysis.explanation_tr}
              </p>
            )}
          </div>

          {/* Key Observation */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={16} className="text-indigo-400" />
              <h2 className="text-base font-display font-semibold text-white">
                En Önemli Gözlem
              </h2>
            </div>

            {analysis.key_observation ? (
              <p className="text-sm text-slate-300 leading-relaxed">
                {analysis.key_observation}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Gözlem bilgisi mevcut değil
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Alignment Map */}
      <motion.div variants={fadeUp} className="glass-card p-6 mb-6">
        <h2 className="text-base font-display font-semibold text-white mb-4">
          Hizalama Haritası (DTW Path)
        </h2>
        <AlignmentMap path={analysis.alignment_map} />
      </motion.div>

      {/* Disclaimer */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-5 text-center">
          <p className="text-sm text-amber-300/90 leading-relaxed">
            ⚠️{' '}
            Bu araç teknik benzerlik analizi sunar; müzik intihalı konusunda kesin hukuki karar
            niteliği taşımaz. Sonuçlar uzman değerlendirmesi için bir ön-gösterge olarak
            kullanılmalıdır.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
