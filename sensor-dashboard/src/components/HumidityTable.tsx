import dayjs from 'dayjs';
import type { TemperatureDoc } from '../hooks/useTemperatureFeed';

type Props = {
  rows: TemperatureDoc[];
};

export function HumidityTable({ rows }: Props) {
  const humidityRows = rows.filter((r) => Number.isFinite(r.humidity));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[320px]">
        <thead>
          <tr>
            <th className="text-left border-b border-gray-300 p-1.5 sm:p-2 text-xs sm:text-sm font-semibold text-gray-800">#</th>
            <th className="text-left border-b border-gray-300 p-1.5 sm:p-2 text-xs sm:text-sm font-semibold text-gray-800">Thoi gian</th>
            <th className="text-left border-b border-gray-300 p-1.5 sm:p-2 text-xs sm:text-sm font-semibold text-gray-800">Do am (%)</th>
          </tr>
        </thead>
        <tbody>
          {humidityRows.map((r, idx) => (
            <tr key={r.id} className="hover:bg-gray-100 transition-colors duration-150">
              <td className="border-b border-gray-200 p-1.5 sm:p-2 text-xs sm:text-sm text-gray-700">{idx + 1}</td>
              <td className="border-b border-gray-200 p-1.5 sm:p-2 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                {dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss')}
              </td>
              <td className="border-b border-gray-200 p-1.5 sm:p-2 text-xs sm:text-sm text-gray-700 font-medium">
                {Number(r.humidity).toFixed(2)}
              </td>
            </tr>
          ))}
          {!humidityRows.length && (
            <tr>
              <td className="border-b border-gray-200 p-1.5 sm:p-2 text-xs sm:text-sm text-center text-gray-500" colSpan={3}>
                Khong co du lieu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default HumidityTable;
