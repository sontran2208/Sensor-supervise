import { useState } from 'react';
import dayjs from 'dayjs';
import DateRangePicker from './DateRangePicker';
import { motion } from 'framer-motion';

type TimeRange = {
  label: string;
  minutes: number;
};

const timeRanges: TimeRange[] = [
  { label: '15 phút', minutes: 15 },
  { label: '30 phút', minutes: 30 },
  { label: '1 giờ', minutes: 60 },
  { label: '3 giờ', minutes: 180 },
  { label: '6 giờ', minutes: 360 },
  { label: '12 giờ', minutes: 720 },
  { label: '24 giờ', minutes: 1440 },
];

type Props = {
  data: Array<{ timestamp: number; value: number; id: string }>;
  selectedTimeRange?: number;
  onTimeRangeChange?: (minutes: number) => void;
  unitLabel?: string; // e.g., '°C' or 'lx'
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  onClearDateRange?: () => void;
  sensorType?: 'temperature' | 'light' | 'distance' | 'gas' | 'gps';
};

export function TimeRangeStats({ data, selectedTimeRange = 30, onTimeRangeChange, unitLabel = '°C', onDateRangeChange, onClearDateRange }: Props) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({start: null, end: null});
  
  // Filter data based on selected time range or custom date range
  const filteredData = data.filter(item => {
    const itemTime = item.timestamp;
    
    if (mode === 'custom' && customDateRange.start && customDateRange.end) {
      // Use custom date range
      return itemTime >= customDateRange.start.getTime() && itemTime <= customDateRange.end.getTime();
    } else {
      // Use preset time range
      const cutoffTime = Date.now() - (selectedTimeRange * 60 * 1000);
      return itemTime >= cutoffTime;
    }
  });

  // Calculate statistics
  const calculateStats = (data: Array<{ value: number } | { airQuality: number }>) => {
    if (data.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        latest: 0,
        trend: 'stable'
      };
    }

    // Handle different data structures
    const values = data.map(d => getValue(d));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values.length > 0 ? values[values.length - 1] : 0;

    // Calculate trend (simple comparison of first half vs second half)
    let trend = 'stable';
    if (values.length >= 4) {
      const mid = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, mid).reduce((sum, val) => sum + val, 0) / mid;
      const secondHalf = values.slice(mid).reduce((sum, val) => sum + val, 0) / (values.length - mid);
      const diff = secondHalf - firstHalf;
      
      if (diff > 0.1) trend = 'increasing';
      else if (diff < -0.1) trend = 'decreasing';
    }

    return { count: values.length, min, max, avg, latest, trend };
  };

  // Helper function to extract value from different data types
  const getValue = (d: any): number => {
    if ('value' in d) return d.value;
    if ('airQuality' in d) return d.airQuality;
    return 0;
  };

  const stats = calculateStats(filteredData);
  const selectedRangeInfo = timeRanges.find(r => r.minutes === selectedTimeRange);




  return (
    <motion.div 
      className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-5 border border-gray-200 mb-5 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">📊 Thống kê theo khoảng thời gian</h3>
      </div>

      {/* Time Range Selector */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setMode('preset')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${
              mode === 'preset' 
                ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white border-transparent shadow-lg transform scale-105' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:shadow-md'
            }`}
          >
            Theo phút
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${
              mode === 'custom' 
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-transparent shadow-lg transform scale-105' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:shadow-md'
            }`}
          >
            Khoảng ngày
          </button>
          {mode === 'custom' && onClearDateRange && (
            <button
              onClick={() => onClearDateRange()}
              className="ml-auto px-3 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Xoá chọn
            </button>
          )}
        </div>

        {mode === 'preset' ? (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {timeRanges.map((range) => (
                <button
                  key={range.minutes}
                  onClick={() => onTimeRangeChange?.(range.minutes)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                    selectedTimeRange === range.minutes 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-lg transform scale-105' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Đã chọn:</strong> {selectedRangeInfo?.label} ({dayjs().subtract(selectedTimeRange, 'minute').format('HH:mm')} - {dayjs().format('HH:mm')})
            </div>
          </>
        ) : (
          <>
            {customDateRange.start && customDateRange.end && (
              <div className="text-sm text-gray-600 mb-3">
                <strong>Đã chọn:</strong> {dayjs(customDateRange.start).format('DD/MM/YYYY HH:mm')} - {dayjs(customDateRange.end).format('DD/MM/YYYY HH:mm')}
              </div>
            )}
          <DateRangePicker
            onApply={(s, e) => {
              setCustomDateRange({start: s, end: e});
              onDateRangeChange?.(s, e);
            }}
            onClear={() => {
              setCustomDateRange({start: null, end: null});
              onClearDateRange?.();
            }}
          />
          </>
        )}
      </div>

      {/* Statistics Cards */}
      {stats.count > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <motion.div 
            className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm hover:shadow-md transition-shadow"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Số mẫu
            </div>
            <div className="text-xl font-bold text-green-600">
              {stats.count}
            </div>
          </motion.div>

          <motion.div 
            className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm hover:shadow-md transition-shadow"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Giá trị mới nhất
            </div>
            <div className="text-xl font-bold text-blue-600">
              {unitLabel === 'lx' ? Math.round(stats.latest) : stats.latest.toFixed(2)} {unitLabel}
            </div>
          </motion.div>

          <motion.div 
            className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm hover:shadow-md transition-shadow"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Trung bình
            </div>
            <div className="text-xl font-bold text-purple-600">
              {unitLabel === 'lx' ? Math.round(stats.avg) : stats.avg.toFixed(2)} {unitLabel}
            </div>
          </motion.div>

          <motion.div 
            className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm hover:shadow-md transition-shadow"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Cao nhất
            </div>
            <div className="text-xl font-bold text-orange-600">
              {unitLabel === 'lx' ? Math.round(stats.max) : stats.max.toFixed(2)} {unitLabel}
            </div>
          </motion.div>

          <motion.div 
            className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm hover:shadow-md transition-shadow"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Thấp nhất
            </div>
            <div className="text-xl font-bold text-blue-500">
              {unitLabel === 'lx' ? Math.round(stats.min) : stats.min.toFixed(2)} {unitLabel}
            </div>
          </motion.div>

          <motion.div 
            className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm hover:shadow-md transition-shadow"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Xu hướng
            </div>
            <div className={`text-lg font-bold ${
              stats.trend === 'increasing' ? 'text-green-600' : 
              stats.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {stats.trend === 'increasing' ? '↗️ Tăng' : 
               stats.trend === 'decreasing' ? '↘️ Giảm' : '➡️ Ổn định'}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="text-center p-10 text-gray-500 border border-dashed border-gray-300 rounded-lg mb-6">
          <div className="text-5xl mb-4">📊</div>
          <div className="text-lg font-bold mb-2">Không có dữ liệu</div>
          <div className="text-sm">
            Không có dữ liệu trong khoảng thời gian đã chọn
          </div>
        </div>
      )}

      {/* Anomalies Section */}
      {/* <div className="mt-6">
        <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          ⚠️ Phản hồi bất thường
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            anomalies.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {anomalies.length} sự kiện
          </span>
        </h4>

        {anomalies.length > 0 ? (
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
            {anomalies.map((a, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <div className="text-sm text-gray-600 font-medium">
                    {dayjs(a.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      a.kind === 'outlier' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {a.kind === 'outlier' ? '🚩 Ngoại lệ' : '📉/📈 Biến động'}
                    </span>
                    <span className="text-gray-500 text-sm">· {a.message}</span>
                  </div>
                  <div className={`text-right font-bold ${
                    a.kind === 'outlier' ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {unitLabel === 'lx' ? Math.round(a.value) : a.value.toFixed(2)} {unitLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-md font-medium">Không phát hiện bất thường trong khoảng thời gian này.</div>
          </div>
        )}
      </div> */}

    </motion.div>
  );
}

export default TimeRangeStats;
