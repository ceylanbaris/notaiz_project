/* ── Risk level badge ── */

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { RISK_COLORS, RISK_LABELS, type RiskLevel } from '../types';

interface RiskBadgeProps {
  risk: RiskLevel;
  large?: boolean;
}

const ICONS: Record<RiskLevel, React.ComponentType<any>> = {
  low: ShieldCheck,
  medium: Shield,
  high: ShieldAlert,
};

export default function RiskBadge({ risk, large = false }: RiskBadgeProps) {
  const color = RISK_COLORS[risk];
  const label = RISK_LABELS[risk];
  const Icon = ICONS[risk];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        inline-flex items-center gap-2 rounded-full font-semibold border
        ${large ? 'px-5 py-2.5 text-base' : 'px-3 py-1.5 text-sm'}
      `}
      style={{
        color,
        borderColor: `${color}33`,
        backgroundColor: `${color}10`,
      }}
    >
      <Icon size={large ? 20 : 16} />
      {label}
    </motion.div>
  );
}
