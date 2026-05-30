/* ── Results Page — Full Analysis Report ── */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
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
  Music,
  Waves,
  Activity,
  Fingerprint,
  Brain,
} from 'lucide-react';
import { getAnalysis } from '../services/api';
import type { Analysis, CategoryType } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';
import SimilarityGauge from '../components/SimilarityGauge';
import MetricChart from '../components/MetricChart';

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
      <motion.div variants={fadeUp} className="glass-card p-8 mb-4 shadow-2xl shadow-purple-500/10">
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
          </div>
        </div>
      </motion.div>

      {/* AI Değerlendirmesi + En Önemli Gözlem */}
      {hasLLM && (
        <motion.div variants={fadeUp} className="space-y-4 mb-4">

          {/* AI Assessment — full-width premium card */}
          <div
            className="rounded-xl border border-purple-500/20 p-6 shadow-xl shadow-purple-500/10 hover:border-purple-500/30 transition-colors duration-200"
            style={{
              background:
                'linear-gradient(135deg, rgba(88,28,135,0.13) 0%, rgba(55,48,163,0.08) 60%, transparent 100%)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} style={{ color: catColor }} />
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                AI Değerlendirmesi
              </h2>
            </div>

            {analysis.category_label_tr && (
              <p
                className="text-2xl font-bold tracking-tight mb-3"
                style={{ color: catColor }}
              >
                {analysis.category_label_tr}
              </p>
            )}

            {confidencePct !== null && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-slate-500">Analiz güveni:</span>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    color: confidenceColor,
                    backgroundColor: `${confidenceColor}20`,
                    border: `1px solid ${confidenceColor}40`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: confidenceColor }}
                  />
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

          {/* En Önemli Gözlem — sol şerit vurgulu kart */}
          <div className="relative rounded-xl border border-white/10 bg-white/[0.02] shadow-xl shadow-purple-500/8 overflow-hidden hover:border-white/15 transition-colors duration-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-indigo-500" />
            <div className="p-6 pl-7">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={14} className="text-violet-400" />
                <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
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
          </div>

        </motion.div>
      )}

      {/* How it works — collapsible */}
      <motion.div variants={fadeUp} className="mb-4">
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
              className="px-5 pb-6 border-t border-white/10"
            >
              <p className="text-sm text-slate-400 leading-relaxed pt-5 mb-5">
                Notaiz, müzikal benzerliği <span className="text-white font-medium">dört bağımsız boyutta</span> eş zamanlı ölçen, ardından bu sinyalleri yapay zeka ile bütünleştiren hibrit bir analiz motorudur. Her boyut, benzerliğin farklı bir müzikal katmanını temsil eder.
              </p>

              {/* 4 signals grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Music size={14} className="text-indigo-300" />
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Melodik · Chroma</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nota ve perde dağılımını karşılaştırır. Tonalite değişse dahi aynı melodiyi tespit edebilir; intihalin en sezgisel boyutunu ölçer.
                  </p>
                </div>

                <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Waves size={14} className="text-purple-300" />
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Harmonik · HPCP</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Akor ilerleyişlerini ve tonal yapıyı ölçer. Farklı enstrümantasyon veya aranjmanda gizlenmiş harmonik ortaklıkları ortaya çıkarır.
                  </p>
                </div>

                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-violet-300" />
                    <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Ritmik · Tempogram</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tempo ve ritim desenini karşılaştırır. Hız değiştirilmiş ya da yeniden yorumlanmış versiyonlardaki yapısal ritim benzerliğini yakalar.
                  </p>
                </div>

                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Fingerprint size={14} className="text-cyan-300" />
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Yapısal · Ses Parmak İzi</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ham akustik kimliği birebir eşleştirir. Cover veya sample kullanımında yüksek skor üretir; aldatılması en zor boyuttur.
                  </p>
                </div>
              </div>

              {/* Pipeline */}
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 overflow-x-auto">
                <span className="text-xs text-slate-500 whitespace-nowrap">Ses Dosyaları</span>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-600 to-indigo-500/60 min-w-[20px]" />
                <span className="text-xs font-medium text-indigo-300 whitespace-nowrap">4 Sinyal</span>
                <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/60 to-violet-500/60 min-w-[20px]" />
                <Brain size={14} className="text-violet-300 shrink-0" />
                <div className="flex-1 h-px bg-gradient-to-r from-violet-500/60 to-green-500/40 min-w-[20px]" />
                <span className="text-xs font-medium text-green-400 whitespace-nowrap">Karar</span>
              </div>

              {/* AI layer */}
              <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-violet-300" />
                  <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Yapay Zeka Yorumu · Gemini</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dört metriğin birleşik profili Gemini'ye iletilir. Model, sayısal sinyalleri müzikal bir bağlama oturtarak olası nedenleri değerlendirir ve güven skoru ile birlikte kategorik bir karar üretir. Böylece rakamlar, jüri için anlamlı bir yoruma dönüşür.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Metrics Chart */}
      {analysis.metrics && (
        <motion.div variants={fadeUp} className="glass-card p-6 mb-4 shadow-xl shadow-purple-500/10">
          <h2 className="text-sm font-bold tracking-tight text-white mb-5">
            Metrik Detayları
          </h2>
          <MetricChart metrics={analysis.metrics} />
        </motion.div>
      )}

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
