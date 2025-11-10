import type { GpsDoc } from '../hooks/useGps';

interface Props {
  rows: GpsDoc[];
}

export default function GpsTable({ rows }: Props) {
  const formatCoordinate = (value: number) => value.toFixed(6);
  const formatSpeed = (value: number) => `${value.toFixed(2)} km/h`;
  const formatAltitude = (value: number) => `${value.toFixed(2)} m`;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 min-w-[800px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thời gian
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Latitude
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Longitude
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Altitude
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Speed
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Satellites
            </th>
            <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Accuracy
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                {new Date(row.timestamp).toLocaleString()}
              </td>
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                {formatCoordinate(row.latitude)}
              </td>
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                {formatCoordinate(row.longitude)}
              </td>
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                {formatAltitude(row.altitude)}
              </td>
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                {formatSpeed(row.speed)}
              </td>
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                {row.satellites}
              </td>
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                {row.accuracy.toFixed(2)}m
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
