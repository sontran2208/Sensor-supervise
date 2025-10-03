import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import dayjs from 'dayjs';

export type DistanceDoc = { id: string; timestamp: number; value: number };

type Props = {
  data: DistanceDoc[];
};

export function DistanceChart({ data }: Props) {
  const chartData = data.map((d) => ({
    t: dayjs(d.timestamp).format('HH:mm:ss'),
    value: d.value,
  }));

  return (
    <div className="w-full h-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: 8, right: 16, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
          <XAxis dataKey="t" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} unit=" cm" />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)} cm`} labelFormatter={(l) => `Thời gian ${l}`} />
          <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DistanceChart;


