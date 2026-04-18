/* ── Alignment heatmap visualisation ── */

import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AlignmentMapProps {
  path: number[][] | null;
}

export default function AlignmentMap({ path }: AlignmentMapProps) {
  const data = useMemo(() => {
    if (!path || path.length === 0) return [];
    return path.map(([x, y]) => ({ x, y }));
  }, [path]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-500 text-sm">
        Hizalama verisi mevcut değil
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Dosya A (frame)"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={{
              value: 'Dosya A (frame)',
              position: 'insideBottom',
              offset: -10,
              fill: '#64748b',
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Dosya B (frame)"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={{
              value: 'Dosya B (frame)',
              angle: -90,
              position: 'insideLeft',
              offset: 15,
              fill: '#64748b',
              fontSize: 12,
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '12px',
              fontSize: 12,
            }}
            labelStyle={{ color: '#a5b4fc' }}
          />
          <Scatter data={data} fill="#818cf8" fillOpacity={0.6} r={2} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
