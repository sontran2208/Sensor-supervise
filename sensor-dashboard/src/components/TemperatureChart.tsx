import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import dayjs from 'dayjs';
import type { TemperatureDoc } from '../hooks/useTemperatureFeed';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type Props = {
  data: TemperatureDoc[];
  highlightTimestamp?: number;
};

export function TemperatureChart({ data, highlightTimestamp }: Props) {
  const labels = data.map((d) => dayjs(d.timestamp).format('HH:mm:ss'));
  const highlightIndex = highlightTimestamp
    ? data.findIndex((d) => d.timestamp === highlightTimestamp)
    : -1;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Temperature',
        data: data.map((d) => d.value),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 2,
        tension: 0.25,
        pointRadius: data.map((_, index) => (index === highlightIndex ? 5 : 0)),
        pointHoverRadius: data.map((_, index) => (index === highlightIndex ? 6 : 3)),
        pointBackgroundColor: data.map((_, index) => (index === highlightIndex ? '#b91c1c' : '#ef4444')),
      },
      {
        label: 'Humidity',
        data: data.map((d) => (Number.isFinite(d.humidity) ? Number(d.humidity) : null)),
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        borderWidth: 2,
        tension: 0.25,
        spanGaps: true,
        yAxisID: 'humidity',
        pointRadius: data.map((_, index) => (index === highlightIndex ? 5 : 0)),
        pointHoverRadius: data.map((_, index) => (index === highlightIndex ? 6 : 3)),
        pointBackgroundColor: data.map((_, index) => (index === highlightIndex ? '#0369a1' : '#0ea5e9')),
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Temperature and Humidity Over Time',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = Number(context.parsed.y);
            return context.dataset.label === 'Temperature'
              ? `${context.dataset.label}: ${value.toFixed(2)} °C`
              : `${context.dataset.label}: ${value.toFixed(2)} %`;
          },
          title: (items: any[]) => `Thời gian ${items[0]?.label ?? ''}`,
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        ticks: {
          callback: (value: number | string) => `${value}°C`,
        },
      },
      humidity: {
        type: 'linear' as const,
        position: 'right' as const,
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: (value: number | string) => `${value}%`,
        },
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  );
}

export default TemperatureChart;


