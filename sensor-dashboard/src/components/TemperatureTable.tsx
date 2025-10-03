import React from 'react';
import dayjs from 'dayjs';
import type { TemperatureDoc } from '../hooks/useTemperatureFeed';

type Props = {
  rows: TemperatureDoc[];
};

export function TemperatureTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left border-b border-gray-300 p-2 text-sm font-semibold text-gray-800">#</th>
            <th className="text-left border-b border-gray-300 p-2 text-sm font-semibold text-gray-800">Thời gian</th>
            <th className="text-left border-b border-gray-300 p-2 text-sm font-semibold text-gray-800">Nhiệt độ (°C)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id} className="hover:bg-gray-100 transition-colors duration-150">
              <td className="border-b border-gray-200 p-2 text-sm text-gray-700">{idx + 1}</td>
              <td className="border-b border-gray-200 p-2 text-sm text-gray-700">{dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss')}</td>
              <td className="border-b border-gray-200 p-2 text-sm text-gray-700">{r.value.toFixed(2)}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="border-b border-gray-200 p-2 text-sm text-center text-gray-500" colSpan={3}>Không có dữ liệu</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TemperatureTable;


