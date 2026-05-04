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

export type DistanceDoc = { id: string; timestamp: number; value: number };

type Props = {
  data: DistanceDoc[];
  highlightTimestamp?: number;
};

export function DistanceChart({ data, highlightTimestamp }: Props) {
  const highlightIndex = highlightTimestamp
    ? data.findIndex((d) => d.timestamp === highlightTimestamp)
    : -1;

  const chartData = {
    labels: data.map((d) => dayjs(d.timestamp).format('HH:mm:ss')),
    datasets: [
      {
        label: 'Distance',
        data: data.map((d) => d.value),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderWidth: 2,
        tension: 0.25,
        pointRadius: data.map((_, index) => (index === highlightIndex ? 5 : 0)),
        pointHoverRadius: data.map((_, index) => (index === highlightIndex ? 6 : 3)),
        pointBackgroundColor: data.map((_, index) => (index === highlightIndex ? '#15803d' : '#22c55e')),
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
        text: 'Distance Sensor Readings Over Time',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} cm`,
          title: (items: any[]) => `Thời gian ${items[0]?.label ?? ''}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number | string) => `${value} cm`,
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

export default DistanceChart;


