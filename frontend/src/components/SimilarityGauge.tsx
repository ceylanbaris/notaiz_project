/* ── Animated similarity score gauge ── */

import React from 'react';
import { motion } from 'framer-motion';
import { RISK_COLORS, type RiskLevel } from '../types';

interface SimilarityGaugeProps {
  score: number; // 0–1
  risk: RiskLevel;
  size?: number;
}

export default function SimilarityGauge({ score, risk, size = 220 }: SimilarityGaugeProps) {
  const percentage = Math.round(score * 100);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score);
  const color = RISK_COLORS[risk];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-20"
        style={{ backgroundColor: color }}
      />

      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-5xl font-display font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          %{percentage}
        </motion.span>
        <span className="text-xs text-surface-400 mt-1 tracking-wider uppercase">benzerlik</span>
      </div>
    </div>
  );
}
