import React from 'react';
import dayjs from 'dayjs';

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
};

export function TimeRangeStats({ data, selectedTimeRange = 30, onTimeRangeChange, unitLabel = '°C' }: Props) {
  // Filter data based on selected time range
  const filteredData = data.filter(item => {
    const itemTime = item.timestamp;
    const cutoffTime = Date.now() - (selectedTimeRange * 60 * 1000);
    return itemTime >= cutoffTime;
  });

  // Calculate statistics
  const calculateStats = (data: Array<{ value: number }>) => {
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

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values[values.length - 1];

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

  const stats = calculateStats(filteredData);
  const selectedRangeInfo = timeRanges.find(r => r.minutes === selectedTimeRange);

  // Detect anomalies within the filtered data (outliers and sudden jumps)
  type Anomaly = {
    kind: 'outlier' | 'jump';
    value: number;
    timestamp: number;
    message: string;
  };

  const anomalies: Anomaly[] = (() => {
    if (filteredData.length < 3) return [];

    // Basic stats for z-score outlier detection
    const values = filteredData.map(d => d.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const results: Anomaly[] = [];

    // Outliers: |z| >= 2.5
    const zThreshold = 2.5;
    if (stdDev > 0) {
      filteredData.forEach(d => {
        const z = Math.abs((d.value - mean) / stdDev);
        if (z >= zThreshold) {
          results.push({
            kind: 'outlier',
            value: d.value,
            timestamp: d.timestamp,
            message: `Ngoại lệ (z ≈ ${(z).toFixed(2)})`
          });
        }
      });
    }

    // Sudden jumps: large delta vs previous sample
    const jumpThreshold = 1.5; // °C change threshold
    for (let i = 1; i < filteredData.length; i++) {
      const prev = filteredData[i - 1];
      const curr = filteredData[i];
      const delta = curr.value - prev.value;
      if (Math.abs(delta) >= jumpThreshold) {
        results.push({
          kind: 'jump',
          value: curr.value,
          timestamp: curr.timestamp,
          message: `${delta > 0 ? 'Tăng' : 'Giảm'} đột ngột (${delta > 0 ? '+' : ''}${delta.toFixed(2)} °C)`
        });
      }
    }

    // Sort by time ascending
    results.sort((a, b) => a.timestamp - b.timestamp);
    return results;
  })();

  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-5">
      <h3 className="mb-4 text-lg font-bold text-gray-800">📊 Thống kê theo khoảng thời gian</h3>

      {/* Time Range Selector */}
      <div className="mb-5">
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
      </div>

      {/* Statistics Cards */}
      {stats.count > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Số mẫu
            </div>
            <div className="text-xl font-bold text-green-600">
              {stats.count}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Giá trị mới nhất
            </div>
            <div className="text-xl font-bold text-blue-600">
              {unitLabel === 'lx' ? Math.round(stats.latest) : stats.latest.toFixed(2)} {unitLabel}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Trung bình
            </div>
            <div className="text-xl font-bold text-purple-600">
              {unitLabel === 'lx' ? Math.round(stats.avg) : stats.avg.toFixed(2)} {unitLabel}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Cao nhất
            </div>
            <div className="text-xl font-bold text-orange-600">
              {unitLabel === 'lx' ? Math.round(stats.max) : stats.max.toFixed(2)} {unitLabel}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Thấp nhất
            </div>
            <div className="text-xl font-bold text-blue-500">
              {unitLabel === 'lx' ? Math.round(stats.min) : stats.min.toFixed(2)} {unitLabel}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center shadow-sm">
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
          </div>
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
      <div className="mt-6">
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
      </div>
    </div>
  );
}

export default TimeRangeStats;
