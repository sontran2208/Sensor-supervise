import type { GasDoc } from '../hooks/useGas';
import dayjs from 'dayjs';

interface Props {
  rows: GasDoc[];
}

export default function GasTable({ rows }: Props) {
  const formatValue = (value: number) => value.toFixed(0);
  const getGasLevel = (raw: number) => {
    // MQ-2 raw values: 0-4095 (ESP32 ADC)
    // Thông thường: < 500 = Low, 500-1500 = Medium, > 1500 = High
    if (raw < 500) return { text: 'Low', color: 'text-green-600' };
    if (raw < 1500) return { text: 'Medium', color: 'text-yellow-600' };
    if (raw < 3000) return { text: 'High', color: 'text-orange-600' };
    return { text: 'Very High', color: 'text-red-600' };
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thời gian
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              MQ-2 Raw Value
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Mức độ
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => {
            const level = getGasLevel(row.mq2_raw);
            return (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                  {dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {formatValue(row.mq2_raw)}
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                  <span className={`font-medium ${level.color}`}>
                    {level.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
