import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import dayjs from 'dayjs';
import type { TemperatureDoc } from '../hooks/useTemperatureFeed';

type Props = {
  data: TemperatureDoc[];
};

export function TemperatureChart({ data }: Props) {
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
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} unit="°C" />
          <Tooltip formatter={(value: number) => `${value.toFixed(2)} °C`} labelFormatter={(l) => `Thời gian ${l}`} />
          <Line type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TemperatureChart;


