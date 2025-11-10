import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import dayjs from 'dayjs';

export type LightDoc = { id: string; timestamp: number; value: number };

type Props = {
  data: LightDoc[];
  highlightTimestamp?: number;
};

export function LightChart({ data, highlightTimestamp }: Props) {
  const chartData = data.map((d) => ({
    t: dayjs(d.timestamp).format('HH:mm:ss'),
    value: d.value,
    ts: d.timestamp,
  }));

  const hl = highlightTimestamp ? dayjs(highlightTimestamp).format('HH:mm:ss') : undefined;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: 8, right: 16, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
          <XAxis dataKey="t" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} unit=" lx" />
          <Tooltip formatter={(value: number) => `${value.toFixed(0)} lx`} labelFormatter={(l) => `Thời gian ${l}`} />
          <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
          {hl && <ReferenceLine x={hl} stroke="#ef4444" strokeDasharray="4 2" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LightChart;


