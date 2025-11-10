import type { GasDoc } from '../hooks/useGas';

interface Props {
  rows: GasDoc[];
}

export default function GasTable({ rows }: Props) {
  const formatValue = (value: number) => value.toFixed(2);
  const formatAirQuality = (value: number) => {
    if (value <= 50) return { text: 'Good', color: 'text-green-600' };
    if (value <= 100) return { text: 'Moderate', color: 'text-yellow-600' };
    if (value <= 150) return { text: 'Unhealthy for Sensitive', color: 'text-orange-600' };
    if (value <= 200) return { text: 'Unhealthy', color: 'text-red-600' };
    if (value <= 300) return { text: 'Very Unhealthy', color: 'text-purple-600' };
    return { text: 'Hazardous', color: 'text-red-800' };
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 min-w-[900px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thời gian
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CO (ppm)
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CO2 (ppm)
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Smoke
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              LPG
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Air Quality
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Temp (°C)
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Humidity (%)
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => {
            const aqi = formatAirQuality(row.airQuality);
            return (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {new Date(row.timestamp).toLocaleString()}
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {formatValue(row.co)}
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {formatValue(row.co2)}
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {formatValue(row.smoke)}
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {formatValue(row.lpg)}
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                  <span className={`font-medium ${aqi.color}`}>
                    {row.airQuality.toFixed(0)} - {aqi.text}
                  </span>
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {formatValue(row.temperature)}
                </td>
                <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {formatValue(row.humidity)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
