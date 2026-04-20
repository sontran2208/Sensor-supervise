import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import dayjs from 'dayjs';
import type { TemperatureDoc } from '../hooks/useTemperatureFeed';

type Props = {
  data: TemperatureDoc[];
  highlightTimestamp?: number;
};

export function HumidityChart({ data, highlightTimestamp }: Props) {
  const chartData = data
    .filter((d) => Number.isFinite(d.humidity))
    .map((d) => ({
      t: dayjs(d.timestamp).format('HH:mm:ss'),
      value: Number(d.humidity),
      ts: d.timestamp,
    }));

  const hl = highlightTimestamp ? dayjs(highlightTimestamp).format('HH:mm:ss') : undefined;

  if (!chartData.length) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
        Chua co du lieu do am
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: 8, right: 16, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
          <XAxis dataKey="t" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
          <Tooltip formatter={(value: number) => `${value.toFixed(2)} %`} labelFormatter={(l) => `Thoi gian ${l}`} />
          <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
          {hl && <ReferenceLine x={hl} stroke="#ef4444" strokeDasharray="4 2" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default HumidityChart;
