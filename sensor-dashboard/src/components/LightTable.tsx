import React from 'react';
import dayjs from 'dayjs';

export type LightDoc = { id: string; timestamp: number; value: number };

type Props = {
  rows: LightDoc[];
};

export function LightTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left border-b border-gray-300 p-2 text-sm font-semibold text-gray-800">#</th>
            <th className="text-left border-b border-gray-300 p-2 text-sm font-semibold text-gray-800">Thời gian</th>
            <th className="text-left border-b border-gray-300 p-2 text-sm font-semibold text-gray-800">Ánh sáng (lx)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id} className="hover:bg-gray-100 transition-colors duration-150">
              <td className="border-b border-gray-200 p-2 text-sm text-gray-700">{idx + 1}</td>
              <td className="border-b border-gray-200 p-2 text-sm text-gray-700">{dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss')}</td>
              <td className="border-b border-gray-200 p-2 text-sm text-gray-700">{Math.round(r.value)}</td>
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

export default LightTable;


