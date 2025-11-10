import { useState } from "react";

type Props = {
  onApply: (startDate: Date, endDate: Date) => void;
  onClear?: () => void;
};

export default function DateRangePicker({ onApply, onClear }: Props) {
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const canApply = Boolean(start && end && new Date(start) <= new Date(end));

  const handleApply = () => {
    if (!canApply) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    onApply(startDate, endDate);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Từ ngày</label>
          <input
            type="datetime-local"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Đến ngày</label>
          <input
            type="datetime-local"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 sm:mt-4 flex items-center gap-2">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
            canApply ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
          }`}
          onClick={handleApply}
          disabled={!canApply}
        >
          Áp dụng
        </button>
        {onClear && (
          <button
            className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onClear}
          >
            Xoá chọn
          </button>
        )}
      </div>
    </div>
  );
}


