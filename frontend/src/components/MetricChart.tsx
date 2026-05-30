/* ── MetricChart — structural primary, others supporting ── */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Music, Waves, Activity, TrendingUp, Info, X } from 'lucide-react';
import type { Metrics } from '../types';

interface MetricChartProps {
  metrics: Metrics;
}

type SupportingEntry = {
  key: keyof Metrics;
  label: string;
  sub: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const SUPPORTING: SupportingEntry[] = [
  { key: 'melodic_similarity',  label: 'Melodik',  sub: 'Chroma',    Icon: Music     },
  { key: 'harmonic_similarity', label: 'Harmonik', sub: 'HPCP',      Icon: Waves     },
  { key: 'rhythmic_similarity', label: 'Ritmik',   sub: 'Tempogram', Icon: Activity  },
];

const THRESHOLD = 70;

// Purple family — darker for low, brighter for high
function structuralBarColor(pct: number): string {
  if (pct < 20) return '#5b21b6';
  if (pct < 45) return '#6d28d9';
  if (pct < 70) return '#7c3aed';
  return '#8b5cf6';
}

// Muted blue-grey — uniform, unalarming
const SUPPORTING_COLOR = '#6b7fa3';

function structuralNote(pct: number): string {
  if (pct < 10) return 'Yapısal eşleşme yok — farklı ses kayıtları';
  if (pct < 30) return 'Düşük yapısal eşleşme — cover/sample desteklenmiyor';
  if (pct < 60) return 'Kısmî akustik eşleşme — detaylı inceleme önerilir';
  if (pct < 80) return 'Güçlü ses parmak izi eşleşmesi — ortak kaynak olası';
  return 'Çok yüksek yapısal eşleşme — aynı ses kaydından türetilmiş olabilir';
}

function supportingNote(key: string, pct: number): string {
  if (key === 'melodic_similarity') {
    if (pct < 30) return 'Farklı melodik yapılar';
    if (pct < 70) return 'Kısmî melodik örtüşme';
    return 'Ortak nota dağılımı (popüler müzikte beklenen)';
  }
  if (key === 'harmonic_similarity') {
    if (pct < 30) return 'Farklı tonal yapılar';
    if (pct < 70) return 'Yaygın akor dizileri paylaşıyor';
    return 'Yüksek harmonik örtüşme (ortak akor kalıpları)';
  }
  if (key === 'rhythmic_similarity') {
    if (pct < 30) return 'Farklı ritim desenleri';
    if (pct < 70) return 'Benzer tempo aralığı (türe özgü)';
    return 'Güçlü ritmik örtüşme (aynı türde beklenen)';
  }
  return '';
}

export default function MetricChart({ metrics }: MetricChartProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  const fusedPct  = metrics.fused_score != null ? Math.round(metrics.fused_score * 100) : null;
  const structRaw = metrics.structural_similarity;
  const structPct = structRaw != null ? Math.round(structRaw * 100) : null;

  return (
    <div className="space-y-5">

      {/* Birleşik skor */}
      {fusedPct != null && (
        <div className="flex items-center justify-between rounded-lg px-4 py-3 bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-300">Birleşik Benzerlik Skoru</span>
            <span className="text-xs text-slate-500">(4 sinyalin ağırlıklı ortalaması)</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-indigo-300 shrink-0 ml-2">
            %{fusedPct}
          </span>
        </div>
      )}

      {/* ── Belirleyici Metrik ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 px-0.5">
          Belirleyici Metrik
        </p>

        {structPct != null && (
          <motion.div
            className="rounded-xl border p-5"
            style={{
              background:
                'linear-gradient(135deg, rgba(91,33,182,0.15) 0%, rgba(139,92,246,0.08) 100%)',
              borderColor: 'rgba(139,92,246,0.28)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="rounded-lg p-1.5"
                  style={{ backgroundColor: 'rgba(139,92,246,0.18)' }}
                >
                  <Fingerprint size={16} className="text-violet-300" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white">Yapısal</span>
                  <span className="text-xs text-slate-500 ml-1.5">· Ses Parmak İzi</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    color: '#a78bfa',
                    backgroundColor: 'rgba(167,139,250,0.13)',
                    border: '1px solid rgba(167,139,250,0.28)',
                  }}
                >
                  Belirleyici
                </span>
                <span
                  className="text-base font-bold tabular-nums"
                  style={{ color: structuralBarColor(structPct) }}
                >
                  %{structPct}
                </span>
              </div>
            </div>

            {/* Bar + threshold */}
            <div className="relative h-3 mb-1">
              <div className="absolute inset-0 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: structuralBarColor(structPct) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${structPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
                />
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-white/30 pointer-events-none"
                style={{ left: `${THRESHOLD}%` }}
              />
            </div>
            <div className="relative h-4 mb-3">
              <span
                className="absolute text-[10px] text-white/20 -translate-x-1/2 select-none"
                style={{ left: `${THRESHOLD}%` }}
              >
                %{THRESHOLD} eşik
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Birebir ses parmak izi eşleşmesi — cover/sample tespitinde birincil gösterge.{' '}
              <span className="text-violet-300/80">{structuralNote(structPct)}</span>
            </p>
          </motion.div>
        )}
      </div>

      {/* ── Destekleyici Metrikler ── */}
      <div>
        {/* Section header */}
        <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Destekleyici Metrikler
          </p>
          <button
            onClick={() => setInfoOpen((o) => !o)}
            className="text-slate-600 hover:text-slate-400 transition-colors flex items-center"
            aria-label="Destekleyici metrikler hakkında bilgi"
          >
            <Info size={11} />
          </button>
        </div>

        {/* Info tooltip */}
        <AnimatePresence>
          {infoOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="relative mb-3 rounded-lg border border-slate-700 bg-slate-800/95 p-4"
            >
              <button
                onClick={() => setInfoOpen(false)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Kapat"
              >
                <X size={12} />
              </button>
              <p className="text-xs text-slate-300 leading-relaxed pr-5">
                Bu metrikler popüler müzikte{' '}
                <span className="text-white font-medium">
                  alakasız şarkılarda bile yüksek çıkabilir
                </span>{' '}
                — ortak akor ve nota kalıpları nedeniyle. Tek başlarına gerçek benzerlik
                göstermez. Sistem benzerlik kararı verirken öncelikli olarak{' '}
                <span className="text-violet-300 font-medium">Yapısal Eşleşmeyi</span>{' '}
                değerlendirir.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SUPPORTING.map(({ key, label, sub, Icon }, i) => {
            const raw = metrics[key];
            if (raw == null) return null;
            const pct  = Math.round((raw as number) * 100);
            const note = supportingNote(key, pct);

            return (
              <motion.div
                key={key}
                className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 + 0.1, duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Icon size={12} className="text-slate-500" />
                    <span className="text-xs font-semibold text-slate-400">{label}</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-slate-400">
                    %{pct}
                  </span>
                </div>

                {/* Thin bar, no threshold */}
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2.5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: SUPPORTING_COLOR }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 + 0.2 }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-snug">
                  <span className="text-slate-600">{sub} · </span>
                  {note}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
