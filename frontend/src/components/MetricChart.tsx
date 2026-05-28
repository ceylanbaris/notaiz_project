/* ── Metric breakdown bars with descriptions ── */

import React from 'react';
import { motion } from 'framer-motion';
import type { Metrics } from '../types';

interface MetricChartProps {
  metrics: Metrics;
}

const METRIC_CONFIG: Record<string, { label: string; description: string; color: string }> = {
  melodic_similarity: {
    label: 'Melodik',
    description: 'Nota ve perde dağılımı benzerliği',
    color: '#818cf8',
  },
  harmonic_similarity: {
    label: 'Harmonik',
    description: 'Akor yapısı ve tonal benzerlik',
    color: '#a78bfa',
  },
  rhythmic_similarity: {
    label: 'Ritmik',
    description: 'Tempo ve ritim deseni benzerliği',
    color: '#c084fc',
  },
  structural_similarity: {
    label: 'Yapısal',
    description: 'Birebir ses parmak izi eşleşmesi (cover/sample tespiti)',
    color: '#6366f1',
  },
};

export default function MetricChart({ metrics }: MetricChartProps) {
  const entries = (Object.entries(metrics) as [string, number][]).filter(
    ([key]) => key !== 'fused_score' && key in METRIC_CONFIG,
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {entries.map(([key, value], i) => {
        const config = METRIC_CONFIG[key];
        const percentage = Math.round(value * 100);
        return (
          <motion.div
            key={key}
            className="rounded-xl bg-white/5 border border-white/10 p-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">{config.label}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: config.color }}>
                %{percentage}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2.5">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: config.color }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: i * 0.08 + 0.15 }}
              />
            </div>
            <p className="text-xs text-slate-500 leading-snug">{config.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
