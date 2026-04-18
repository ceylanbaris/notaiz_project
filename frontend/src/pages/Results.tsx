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
} from 'lucide-react';
import { getAnalysis, getAnalysisPdfUrl } from '../services/api';
import type { Analysis } from '../types';
import SimilarityGauge from '../components/SimilarityGauge';
import RiskBadge from '../components/RiskBadge';
import MetricChart from '../components/MetricChart';
import AlignmentMap from '../components/AlignmentMap';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const riskLevel = analysis.risk_level || 'low';

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
              <RiskBadge risk={riskLevel as any} large />
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

          {/* Metric values */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Cosine', value: analysis.metrics.cosine_similarity, color: '#818cf8' },
              { label: 'DTW', value: analysis.metrics.dtw_distance_normalized, color: '#a78bfa' },
              { label: 'Korelasyon', value: analysis.metrics.correlation, color: '#c084fc' },
              { label: 'Fused', value: analysis.metrics.fused_score, color: '#6366f1' },
            ].map((m) => (
              <div
                key={m.label}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center"
              >
                <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                <p className="text-lg font-bold" style={{ color: m.color }}>
                  {(m.value * 100).toFixed(1)}%
                </p>
              </div>
            ))}
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
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-center">
          <p className="text-xs text-amber-300/80 leading-relaxed">
            ⚠️ {analysis.disclaimer ?? 'Bu sistem yalnızca teknik benzerlik sinyali üretir; telif hukuku kararı niteliği taşımaz.'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
