import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import dayjs from 'dayjs';
import type { TemperatureDoc } from '../hooks/useTemperatureFeed';

type Props = {
  data: TemperatureDoc[];
  highlightTimestamp?: number;
};

export function TemperatureChart({ data, highlightTimestamp }: Props) {
  const chartData = data.map((d) => ({
    t: dayjs(d.timestamp).format('HH:mm:ss'),
    temperature: d.value,
    humidity: Number.isFinite(d.humidity) ? Number(d.humidity) : null,
    ts: d.timestamp,
  }));

  const hl = highlightTimestamp ? dayjs(highlightTimestamp).format('HH:mm:ss') : undefined;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: 8, right: 16, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
          <XAxis dataKey="t" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="temp" tick={{ fontSize: 12 }} domain={['auto', 'auto']} unit="°C" />
          <YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'temperature' ? `${value.toFixed(2)} °C` : `${value.toFixed(2)} %`
            }
            labelFormatter={(l) => `Thời gian ${l}`}
          />
          <Line
            type="monotone"
            yAxisId="temp"
            dataKey="temperature"
            name="temperature"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            yAxisId="humidity"
            dataKey="humidity"
            name="humidity"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          {hl && <ReferenceLine x={hl} stroke="#ef4444" strokeDasharray="4 2" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TemperatureChart;


