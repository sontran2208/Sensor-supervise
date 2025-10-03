import React, { useMemo, useState } from "react";
import { useTemperature } from "./hooks/useTemperature";
import TemperatureTable from "./components/TemperatureTable";
import TemperatureChart from "./components/TemperatureChart";
import LightChart from "./components/LightChart";
import LightTable from "./components/LightTable";
import DistanceChart from "./components/DistanceChart";
import DistanceTable from "./components/DistanceTable";
import TimeRangeStats from "./components/TimeRangeStats";
import {
  seedTemperatureLastMinutes, seedTemperatureLastMinutesWithAnomalies,
  seedLightLastMinutes, seedLightLastMinutesWithAnomalies,
  seedDistanceLastMinutes, seedDistanceLastMinutesWithAnomalies
} from "./dev/seed";
import { firebaseConfigured } from "./firebase";
import { useLight } from "./hooks/useLight";
import { useDistance } from "./hooks/useDistance";

type Sensor = "temperature" | "light" | "distance";

export default function App() {
  const [selectedTimeRange, setSelectedTimeRange] = useState(30); // minutes
  const [sensor, setSensor] = useState<Sensor>("temperature");

  if (!firebaseConfigured) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full max-w-none lg:max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
          <h1 className="text-xl font-bold text-gray-800 mb-3">📊 Thống kê cảm biến</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">
              ⚠️ Chưa cấu hình Firebase (.env). Vui lòng thêm các biến VITE_FIREBASE_* rồi chạy lại dev server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // data hooks
  const { data: tempData = [], loading, error } = useTemperature(200);
  const { data: lightData = [], loading: loadingLight } = useLight(200);
  const { data: distanceData = [], loading: loadingDistance } = useDistance(200);

  const cutoff = useMemo(
    () => Date.now() - selectedTimeRange * 60 * 1000,
    [selectedTimeRange]
  );

  const filteredTemp = useMemo(() => tempData.filter(d => d.timestamp >= cutoff), [tempData, cutoff]);
  const filteredLight = useMemo(() => lightData.filter(d => d.timestamp >= cutoff), [lightData, cutoff]);
  const filteredDistance = useMemo(() => distanceData.filter(d => d.timestamp >= cutoff), [distanceData, cutoff]);

  const unitLabel: Record<Sensor, string> = { temperature: "°C", light: "lx", distance: "cm" };
  const isLoading = loading || loadingLight || loadingDistance;

  return (
    <div className="min-h-screen bg-white">
      {/* Responsive container: mobile full width, desktop max width with center */}
      <div className="w-full max-w-none lg:max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Header - responsive text sizes */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            📊 Thống kê cảm biến
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Theo dõi dữ liệu cảm biến real-time
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">❌ Lỗi: {String(error)}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* Sensor Tabs - Mobile scroll, Desktop centered */}
            <div className="mb-6 lg:mb-8">
              <div className="flex justify-center sm:justify-start space-x-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSensor("temperature")}
                  className={`flex-shrink-0 px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                    sensor === "temperature"
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg transform scale-105"
                      : "bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 hover:shadow-md"
                  }`}
                >
                  🌡️ Nhiệt độ
                </button>
                <button
                  onClick={() => setSensor("light")}
                  className={`flex-shrink-0 px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                    sensor === "light"
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg transform scale-105"
                      : "bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 hover:shadow-md"
                  }`}
                >
                  💡 Ánh sáng
                </button>
                <button
                  onClick={() => setSensor("distance")}
                  className={`flex-shrink-0 px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                    sensor === "distance"
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                      : "bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 hover:shadow-md"
                  }`}
                >
                  📏 Khoảng cách
                </button>
              </div>
            </div>

            {/* Time Range Stats */}
            <div className="mb-6">
              <TimeRangeStats
                data={
                  sensor === "temperature" ? tempData :
                  sensor === "light" ? (lightData as any) : (distanceData as any)
                }
                selectedTimeRange={selectedTimeRange}
                onTimeRangeChange={setSelectedTimeRange}
                unitLabel={unitLabel[sensor]}
              />
            </div>

            {/* Chart & Table - Desktop side by side */}
            <div className="mb-6 lg:mb-8">
              {/* Mobile: Stacked, Desktop: Side by side */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                {/* Chart Section */}
                <div className="mb-6 lg:mb-0">
                  <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4">
                      📈 Biểu đồ {sensor === "temperature" ? "nhiệt độ" : sensor === "light" ? "ánh sáng" : "khoảng cách"}
                    </h3>
                    <div className="h-64 lg:h-80">
                      {sensor === "temperature" && <TemperatureChart data={filteredTemp} />}
                      {sensor === "light" && <LightChart data={filteredLight} />}
                      {sensor === "distance" && <DistanceChart data={filteredDistance} />}
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                <div>
                  <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 lg:px-6 lg:py-4 border-b border-gray-200">
                      <h3 className="text-lg lg:text-xl font-semibold text-gray-800">
                        📋 Bảng dữ liệu
                      </h3>
                    </div>
                    <div className="overflow-x-auto max-h-80 lg:max-h-96 overflow-y-auto">
                      {sensor === "temperature" && <TemperatureTable rows={[...filteredTemp].reverse()} />}
                      {sensor === "light" && <LightTable rows={[...filteredLight].reverse()} />}
                      {sensor === "distance" && <DistanceTable rows={[...filteredDistance].reverse()} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DEV Buttons - Mobile stacked, Desktop horizontal */}
            {import.meta.env.DEV && (
              <div className="space-y-3 lg:space-y-4">
                <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-3 lg:mb-4">
                  🛠️ Dev Tools
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                  {sensor === "temperature" && (
                    <>
                      <button
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                        onClick={() => seedTemperatureLastMinutes(30)}
                      >
                        🌡️ Fake nhiệt độ 30 phút
                      </button>
                      <button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                        onClick={() => seedTemperatureLastMinutesWithAnomalies(30)}
                      >
                        ⚠️ Fake nhiệt độ (có bất thường)
                      </button>
                    </>
                  )}
                  {sensor === "light" && (
                    <>
                      <button
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                        onClick={() => seedLightLastMinutes(30)}
                      >
                        💡 Fake ánh sáng 30 phút
                      </button>
                      <button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                        onClick={() => seedLightLastMinutesWithAnomalies(30)}
                      >
                        ⚠️ Fake ánh sáng (có bất thường)
                      </button>
                    </>
                  )}
                  {sensor === "distance" && (
                    <>
                      <button
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                        onClick={() => seedDistanceLastMinutes(30)}
                      >
                        📏 Fake khoảng cách 30 phút
                      </button>
                      <button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                        onClick={() => seedDistanceLastMinutesWithAnomalies(30)}
                      >
                        ⚠️ Fake khoảng cách (có bất thường)
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
