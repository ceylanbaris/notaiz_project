/* ── Analysis result report card ── */

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, FileAudio, Timer } from 'lucide-react';
import type { Analysis } from '../types';

interface ReportCardProps {
  analysis: Analysis;
  onClick?: () => void;
  compact?: boolean;
}

export default function ReportCard({ analysis, onClick, compact = false }: ReportCardProps) {
  const riskColors: Record<string, string> = {
    low: 'border-green-500/20 bg-green-500/5',
    medium: 'border-amber-500/20 bg-amber-500/5',
    high: 'border-red-500/20 bg-red-500/5',
  };

  const riskTextColors: Record<string, string> = {
    low: 'text-green-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };

  const riskLabels: Record<string, string> = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
  };

  const borderClass = analysis.risk_level
    ? riskColors[analysis.risk_level] || 'border-surface-700 bg-surface-800/50'
    : 'border-surface-700 bg-surface-800/50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`
        rounded-2xl border backdrop-blur-sm p-5 transition-all cursor-pointer
        hover:shadow-lg hover:shadow-primary-500/5
        ${borderClass}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FileAudio size={16} className="text-primary-400" />
            <span className="text-sm font-medium text-surface-200 truncate">
              {analysis.file_a_name || 'Dosya A'}
            </span>
            <span className="text-xs text-surface-500">vs</span>
            <span className="text-sm font-medium text-surface-200 truncate">
              {analysis.file_b_name || 'Dosya B'}
            </span>
          </div>

          {!compact && (
            <div className="flex items-center gap-4 text-xs text-surface-400 mt-2">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(analysis.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
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
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          {analysis.fused_score !== null && (
            <span className={`text-lg font-bold ${riskTextColors[analysis.risk_level || 'low']}`}>
              %{Math.round(analysis.fused_score * 100)}
            </span>
          )}
          {analysis.risk_level && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                riskColors[analysis.risk_level]
              } ${riskTextColors[analysis.risk_level]}`}
            >
              {riskLabels[analysis.risk_level]}
            </span>
          )}
          {analysis.status === 'processing' && (
            <span className="text-xs text-primary-400 animate-pulse">İşleniyor...</span>
          )}
          {analysis.status === 'failed' && (
            <span className="text-xs text-red-400">Başarısız</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
