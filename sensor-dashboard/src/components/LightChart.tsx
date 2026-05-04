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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export type LightDoc = { id: string; timestamp: number; value: number };

type Props = {
  data: LightDoc[];
  highlightTimestamp?: number;
};

export function LightChart({ data, highlightTimestamp }: Props) {
  const highlightIndex = highlightTimestamp
    ? data.findIndex((d) => d.timestamp === highlightTimestamp)
    : -1;

  const chartData = {
    labels: data.map((d) => dayjs(d.timestamp).format('HH:mm:ss')),
    datasets: [
      {
        label: 'Light Intensity',
        data: data.map((d) => d.value),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderWidth: 2,
        tension: 0.25,
        pointRadius: data.map((_, index) => (index === highlightIndex ? 5 : 0)),
        pointHoverRadius: data.map((_, index) => (index === highlightIndex ? 6 : 3)),
        pointBackgroundColor: data.map((_, index) => (index === highlightIndex ? '#b45309' : '#f59e0b')),
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Light Sensor Readings Over Time',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(0)} lx`,
          title: (items: any[]) => `Thời gian ${items[0]?.label ?? ''}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number | string) => `${value} lx`,
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

export default LightChart;


