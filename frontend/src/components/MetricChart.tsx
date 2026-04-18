/* ── Metric breakdown bar chart ── */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Metrics } from '../types';

interface MetricChartProps {
  metrics: Metrics;
}

const METRIC_LABELS: Record<string, string> = {
  cosine_similarity: 'Cosine',
  dtw_distance_normalized: 'DTW',
  correlation: 'Korelasyon',
  fused_score: 'Fused',
};

const COLORS = ['#818cf8', '#a78bfa', '#c084fc', '#6366f1'];

export default function MetricChart({ metrics }: MetricChartProps) {
  const data = Object.entries(metrics).map(([key, value], i) => ({
    name: METRIC_LABELS[key] || key,
    value: Number((value * 100).toFixed(1)),
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '12px',
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}%`, 'Skor']}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
