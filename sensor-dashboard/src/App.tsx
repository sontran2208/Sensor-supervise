import { useMemo, useState, useEffect, useRef } from "react";
import { useTemperature } from "./hooks/useTemperature";
import { useHumidity } from "./hooks/useHumidity";
import TemperatureTable from "./components/TemperatureTable";
import TemperatureChart from "./components/TemperatureChart";
import LightChart from "./components/LightChart";
import LightTable from "./components/LightTable";
import DistanceChart from "./components/DistanceChart";
import DistanceTable from "./components/DistanceTable";
import GpsChart from "./components/GpsChart";
import GpsTable from "./components/GpsTable";
import FreeGpsMap from "./components/FreeGpsMap";
import GasChart from "./components/GasChart";
import GasTable from "./components/GasTable";
import GasDashboard from "./components/GasDashboard";
import TimeRangeStats from "./components/TimeRangeStats";
import Header from "./components/Header";
import EdgeAIDashboard from "./components/EdgeAIDashboard";
import BaselineDataCollector from "./components/BaselineDataCollector";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { firebaseConfigured } from "./firebase";
import { HiExclamationCircle, HiChartBar, HiInformationCircle, HiClipboard } from "react-icons/hi";
import { FaThermometerHalf, FaLightbulb, FaRuler, FaMapMarkerAlt, FaWind, FaRobot } from "react-icons/fa";
import { MdShowChart } from "react-icons/md";
import { useLight } from "./hooks/useLight";
import { useDistance } from "./hooks/useDistance";
import { useGps } from "./hooks/useGps";
import { useGas } from "./hooks/useGas";
import { useEdgeAI } from "./hooks/useEdgeAI";
import { publishServoCommandToRTDB } from "./utils/servoCommands";
import { publishRelayStateToRTDB } from "./utils/relayCommands";
import type { ActuatorCommand } from "./ai/ActuatorController";
import type { RelayAutomationDecision } from "./ai/RelayAutomationController";
import RelayController from "./components/RelayController";

type Sensor = "temperature" | "light" | "distance" | "gps" | "gas";
type Page = "dashboard" | "ai" | "camera";

// ===== Constants =====
const FEED_MS = 5000;
const RECENT_WINDOW_MS = 60_000;
const MAX_SAMPLES_PER_FEED = 50; // Tăng số mẫu để phát hiện drift tốt hơn
const GPS_MAX_MPS = 100; // clamp vật lý ~360 km/h
const SERVO_DEVICE_ID = import.meta.env.VITE_SERVO_DEVICE_ID || "default-servo";
/** Bật ghi RTDB `/relayControl` theo nhiệt độ + AI. Tắt: `VITE_RELAY_AUTOMATION=false` */
const RELAY_AUTOMATION_ENABLED = import.meta.env.VITE_RELAY_AUTOMATION !== "false";

export default function App() {
  // ---- State/UI ----
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [selectedTimeRange, setSelectedTimeRange] = useState(30); // minutes
  const [sensor, setSensor] = useState<Sensor>("temperature");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // ---- Edge AI ----
  const { processSensorData, alerts, systemStatus } = useEdgeAI();

  // ---- Feed dedup markers ----
  const lastSentRef = useRef<Record<string, number>>({
    temperature: 0, light: 0, distance: 0, gas: 0, gps: 0
  });

  // ---- Simulator ----
  // Calculate useCustom before hooks
  const useCustom = Boolean(customStartDate && customEndDate);
  const cutoff = useMemo(
    () => Date.now() - selectedTimeRange * 60 * 1000,
    [selectedTimeRange]
  );

  // ---- Data hooks (luôn gọi trước mọi early return) ----
  // Pass timeRangeMinutes to query only recent data from Firestore (server-side filter)
  const { data: tempData = [], loading, error } = useTemperature(200, useCustom ? undefined : selectedTimeRange, customStartDate || undefined, customEndDate || undefined);
  const { data: humidityData = [], loading: loadingHumidity } = useHumidity(200, useCustom ? undefined : selectedTimeRange, customStartDate || undefined, customEndDate || undefined);
  const { data: lightData = [], loading: loadingLight } = useLight(200, useCustom ? undefined : selectedTimeRange, customStartDate || undefined, customEndDate || undefined);
  const { data: distanceData = [], loading: loadingDistance } = useDistance(200, useCustom ? undefined : selectedTimeRange, customStartDate || undefined, customEndDate || undefined);
  const { data: gpsData = [], loading: loadingGps } = useGps(200);
  const { data: gasData = [], loading: loadingGas } = useGas(200);

  const filteredTemp = useMemo(() => {
    if (useCustom && customStartDate && customEndDate) {
      const s = customStartDate.getTime(); const e = customEndDate.getTime();
      return tempData.filter(d => d.timestamp >= s && d.timestamp <= e);
    }
    return tempData.filter(d => d.timestamp >= cutoff);
  }, [tempData, cutoff, useCustom, customStartDate, customEndDate]);

  const filteredHumidity = useMemo(() => {
    if (useCustom && customStartDate && customEndDate) {
      const s = customStartDate.getTime(); const e = customEndDate.getTime();
      return humidityData.filter(d => d.timestamp >= s && d.timestamp <= e);
    }
    return humidityData.filter(d => d.timestamp >= cutoff);
  }, [humidityData, cutoff, useCustom, customStartDate, customEndDate]);

  const mergedTempData = useMemo(() => {
    if (!filteredTemp.length) return filteredTemp;
    if (!filteredHumidity.length) return filteredTemp.map((t) => ({ ...t, humidity: undefined }));

    let j = 0;
    const MAX_PAIR_DIFF_MS = 30_000;
    return filteredTemp.map((t) => {
      while (j + 1 < filteredHumidity.length && filteredHumidity[j + 1].timestamp <= t.timestamp) {
        j += 1;
      }

      const candidates = [filteredHumidity[j], filteredHumidity[j + 1]].filter(Boolean);
      let best: { timestamp: number; value: number } | undefined;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (const c of candidates) {
        const diff = Math.abs(c.timestamp - t.timestamp);
        if (diff < bestDiff) {
          best = c;
          bestDiff = diff;
        }
      }

      return {
        ...t,
        humidity: best && bestDiff <= MAX_PAIR_DIFF_MS ? best.value : undefined
      };
    });
  }, [filteredTemp, filteredHumidity]);
  const filteredLight = useMemo(() => {
    if (useCustom && customStartDate && customEndDate) {
      const s = customStartDate.getTime(); const e = customEndDate.getTime();
      return lightData.filter(d => d.timestamp >= s && d.timestamp <= e);
    }
    return lightData.filter(d => d.timestamp >= cutoff);
  }, [lightData, cutoff, useCustom, customStartDate, customEndDate]);

  const filteredDistance = useMemo(() => {
    if (useCustom && customStartDate && customEndDate) {
      const s = customStartDate.getTime(); const e = customEndDate.getTime();
      return distanceData.filter(d => d.timestamp >= s && d.timestamp <= e);
    }
    return distanceData.filter(d => d.timestamp >= cutoff);
  }, [distanceData, cutoff, useCustom, customStartDate, customEndDate]);

  const filteredGps = useMemo(() => {
    if (useCustom && customStartDate && customEndDate) {
      const s = customStartDate.getTime(); const e = customEndDate.getTime();
      return gpsData.filter(d => d.timestamp >= s && d.timestamp <= e);
    }
    return gpsData.filter(d => d.timestamp >= cutoff);
  }, [gpsData, cutoff, useCustom, customStartDate, customEndDate]);

  const filteredGas = useMemo(() => {
    if (useCustom && customStartDate && customEndDate) {
      const s = customStartDate.getTime(); const e = customEndDate.getTime();
      return gasData.filter(d => d.timestamp >= s && d.timestamp <= e);
    }
    return gasData.filter(d => d.timestamp >= cutoff);
  }, [gasData, cutoff, useCustom, customStartDate, customEndDate]);

  // ---- Firebase banner (không return trước hooks) ----
  const FirebaseBanner = !firebaseConfigured ? (
    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
      <p className="text-red-600 text-sm">
        ⚠️ Chưa cấu hình Firebase (.env). Vui lòng thêm các biến VITE_FIREBASE_* rồi chạy lại dev server.
      </p>
    </div>
  ) : null;

  // ---- Dedup toast theo alert.id ----
  const seenAlertIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    // chọn 3 alert gần nhất
    const last3 = alerts.slice(-3);
    last3.forEach((a: any) => {
      if (!a?.id) return; // cần id để dedup
      if (seenAlertIdsRef.current.has(a.id)) return;
      seenAlertIdsRef.current.add(a.id);

      const msg = `[Alert] ${a.message}`;
      if (a.severity === "critical") toast.error(msg);
      else if (a.severity === "high") toast(msg, { icon: <HiExclamationCircle className="w-5 h-5" /> });
      else if (a.severity === "medium") toast(msg, { icon: <HiChartBar className="w-5 h-5" /> });
      else toast(msg, { icon: <HiInformationCircle className="w-5 h-5" /> });
    });
  }, [alerts]);

  // ---- Refs cho dữ liệu để interval đọc ổn định (không tái tạo interval) ----
  const tempRef = useRef<any[]>([]);
  const lightRef = useRef<any[]>([]);
  const distRef = useRef<any[]>([]);
  const gasRef = useRef<any[]>([]);
  const gpsRef = useRef<any[]>([]);
  useEffect(() => { tempRef.current = filteredTemp }, [filteredTemp]);
  useEffect(() => { lightRef.current = filteredLight }, [filteredLight]);
  useEffect(() => { distRef.current = filteredDistance }, [filteredDistance]);
  useEffect(() => { gasRef.current = filteredGas }, [filteredGas]);
  useEffect(() => { gpsRef.current = filteredGps }, [filteredGps]);

  // ---- Interval feed cố định chỉ phụ thuộc processSensorData ----
  useEffect(() => {
    if (!processSensorData) return;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const feed = async () => {
      const now = Date.now();
      const readings: Array<{ timestamp: number; value: number; sensorType: Sensor }> = [];

      // helper lấy mới + giới hạn tối đa MAX_SAMPLES_PER_FEED mẫu mới nhất (tăng để phát hiện drift tốt hơn)
      const takeNew = <T extends { timestamp: number }>(arr: T[], last: number) =>
        arr.filter(i => i.timestamp > (last || 0) && now - i.timestamp < RECENT_WINDOW_MS).slice(-MAX_SAMPLES_PER_FEED);

      // Temperature
      const tempNew = takeNew(tempRef.current, lastSentRef.current.temperature);
      tempNew.forEach(item => readings.push({ timestamp: item.timestamp, value: item.value, sensorType: "temperature" }));

      // Light
      const lightNew = takeNew(lightRef.current, lastSentRef.current.light);
      lightNew.forEach(item => readings.push({ timestamp: item.timestamp, value: item.value, sensorType: "light" }));

      // Distance
      const distNew = takeNew(distRef.current, lastSentRef.current.distance);
      distNew.forEach(item => readings.push({ timestamp: item.timestamp, value: item.value, sensorType: "distance" }));

      // Gas → sử dụng mq2_raw (format mới từ Arduino code)
      const gasNew = takeNew(gasRef.current, lastSentRef.current.gas);
      gasNew.forEach((item: any) => {
        // Lấy mq2_raw từ dữ liệu (0-4095 cho ESP32 ADC)
        const mq2_raw = Math.max(0, Number(item.mq2_raw ?? 0));
        // Chuyển đổi mq2_raw thành giá trị composite (0-100) cho AI system
        // Ngưỡng: < 500 = Low (0-25), 500-1500 = Medium (25-50), 1500-3000 = High (50-75), > 3000 = Very High (75-100)
        let composite = 0;
        if (mq2_raw < 500) {
          composite = (mq2_raw / 500) * 25; // 0-25
        } else if (mq2_raw < 1500) {
          composite = 25 + ((mq2_raw - 500) / 1000) * 25; // 25-50
        } else if (mq2_raw < 3000) {
          composite = 50 + ((mq2_raw - 1500) / 1500) * 25; // 50-75
        } else {
          composite = 75 + Math.min(25, ((mq2_raw - 3000) / 1095) * 25); // 75-100
        }
        readings.push({ timestamp: item.timestamp, value: composite, sensorType: "gas" });
      });

      // GPS → m/s + clamp + jumpSpeed Haversine
      // New format: lat, lng, mode (REAL/SIMULATED)
      const gpsArr = takeNew(gpsRef.current, lastSentRef.current.gps) as any[];
      for (let i = 0; i < gpsArr.length; i++) {
        const cur = gpsArr[i];
        const prev = i > 0 ? gpsArr[i - 1] : null;
        
        // Get coordinates (support both old and new format)
        const curLat = cur.lat ?? cur.latitude;
        const curLng = cur.lng ?? cur.longitude;
        const curMode = cur.mode;
        
        // If we have speed from GPS module, use it; otherwise calculate from haversine
        const rawSpeed = Number(cur?.speed ?? 0);
        const speedMps = rawSpeed > 40 ? rawSpeed / 3.6 : rawSpeed; // km/h → m/s
        let effectiveSpeed = speedMps;

        if (prev) {
          const prevLat = prev.lat ?? prev.latitude;
          const prevLng = prev.lng ?? prev.longitude;
          const dt = Math.max(0, (cur.timestamp - prev.timestamp) / 1000);
          
          if (
            dt > 0 &&
            typeof curLat === "number" && typeof curLng === "number" &&
            typeof prevLat === "number" && typeof prevLng === "number"
          ) {
            const dist = haversineMeters(prevLat, prevLng, curLat, curLng);
            const jumpSpeed = dist / dt;
            if (!Number.isNaN(jumpSpeed) && Number.isFinite(jumpSpeed)) {
              effectiveSpeed = Math.max(effectiveSpeed, jumpSpeed);
            }
          }
        }
        
        // Only process REAL GPS data for AI (skip SIMULATED to avoid false positives)
        // But still calculate speed for both to show in UI
        const bounded = Math.max(0, Math.min(effectiveSpeed, GPS_MAX_MPS));
        
        // Only send to AI if mode is REAL or undefined (backward compatibility)
        if (!curMode || curMode === "REAL") {
          readings.push({ timestamp: cur.timestamp, value: bounded, sensorType: "gps" });
        }
      }

      if (readings.length) {
        try {
          const result = await processSensorData(readings as any);

          // Check result is object and has actuatorActions array
          let actuatorActions: ActuatorCommand[] = [];
          if (
            result &&
            typeof result === "object" &&
            Array.isArray((result as any).actuatorActions)
          ) {
            actuatorActions = (result as { actuatorActions: ActuatorCommand[] }).actuatorActions;
          }

          if (actuatorActions.length) {
            try {
              await Promise.all(
                actuatorActions.map((action) =>
                  publishServoCommandToRTDB(SERVO_DEVICE_ID, action)
                )
              );
            } catch (err) {
              console.error("Failed to publish servo command:", err);
            }
          }

          if (RELAY_AUTOMATION_ENABLED) {
            let relayActions: RelayAutomationDecision[] = [];
            if (
              result &&
              typeof result === "object" &&
              Array.isArray((result as { relayActions?: RelayAutomationDecision[] }).relayActions)
            ) {
              relayActions = (result as { relayActions: RelayAutomationDecision[] }).relayActions;
            }
            const toPublish = relayActions.filter((d) => d.status === "executing");
            for (const d of toPublish) {
              try {
                await publishRelayStateToRTDB(d.targetState);
              } catch (err) {
                console.error("Failed to publish relay state:", err);
              }
            }
          }
          if (tempNew.length) lastSentRef.current.temperature = Math.max(lastSentRef.current.temperature || 0, tempNew.at(-1)!.timestamp);
          if (lightNew.length) lastSentRef.current.light = Math.max(lastSentRef.current.light || 0, lightNew.at(-1)!.timestamp);
          if (distNew.length) lastSentRef.current.distance = Math.max(lastSentRef.current.distance || 0, distNew.at(-1)!.timestamp);
          if (gasNew.length) lastSentRef.current.gas = Math.max(lastSentRef.current.gas || 0, gasNew.at(-1)!.timestamp);
          if (gpsArr.length) lastSentRef.current.gps = Math.max(lastSentRef.current.gps || 0, gpsArr.at(-1)!.timestamp);
        } catch {}
      }
    };

    const id = setInterval(feed, FEED_MS);
    return () => clearInterval(id);
  }, [processSensorData]);

  // ---- Debug system status (giữ nguyên) ----
  useEffect(() => {
    if (systemStatus) {
      // console.log('🤖 AI System Status:', systemStatus);
    }
  }, [systemStatus]);

  // ---- UI helpers ----
  const unitLabel: Record<Sensor, string> = {
    temperature: "°C",
    light: "lx",
    distance: "cm",
    gps: "m/s", // đổi về numeric để Stats dùng được
    gas: "ppm"
  };
  const isLoading = loading || loadingHumidity || loadingLight || loadingDistance || loadingGps || loadingGas;

  const latestAlert = alerts?.length ? alerts[alerts.length - 1] : null;

  const reversedTemp = useMemo(() => [...mergedTempData].reverse(), [mergedTempData]);
  const reversedLight = useMemo(() => [...filteredLight].reverse(), [filteredLight]);
  const reversedDistance = useMemo(() => [...filteredDistance].reverse(), [filteredDistance]);
  const reversedGps = useMemo(() => [...filteredGps].reverse(), [filteredGps]);
  const reversedGas = useMemo(() => [...filteredGas].reverse(), [filteredGas]);

  // ---- Page switch early return (sau hooks) ----
  if (currentPage === "ai") {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full lg:max-w-7xl mx-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 lg:px-8 lg:py-4 xl:px-12">
          <Header currentPage={currentPage} onPageChange={(page) => setCurrentPage(page as Page)} />
          {FirebaseBanner}
          <div className="space-y-3 sm:space-y-4">
            <BaselineDataCollector />
            <EdgeAIDashboard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="w-full lg:max-w-7xl mx-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 lg:px-8 lg:py-4 xl:px-12">
        {/* Header */}
        <Header currentPage={currentPage} onPageChange={(page) => setCurrentPage(page as Page)} />
        {FirebaseBanner}

        {/* Error */}
        {error && (
          <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
            <p className="text-red-600 text-xs sm:text-sm">❌ Lỗi: {String(error)}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* Sensor Tabs */}
            <motion.div
              className="mb-4 sm:mb-6 lg:mb-8 -mx-3 sm:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex justify-start gap-2 overflow-x-auto pb-2 scrollbar-hide px-3 sm:px-0">
                {([
                  { k: "temperature", label: "Nhiệt độ", icon: FaThermometerHalf, activeClass: "from-red-500 to-orange-500" },
                  { k: "light", label: "Ánh sáng", icon: FaLightbulb, activeClass: "from-yellow-400 to-yellow-600" },
                  { k: "distance", label: "Khoảng cách", icon: FaRuler, activeClass: "from-blue-500 to-purple-600" },
                  { k: "gps", label: "GPS", icon: FaMapMarkerAlt, activeClass: "from-green-500 to-emerald-600" },
                  { k: "gas", label: "Khí gas", icon: FaWind, activeClass: "from-red-500 to-pink-600" }
                ] as Array<{k: Sensor; label: string; icon: any; activeClass: string}>).map((b) => (
                  <motion.button
                    key={b.k}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSensor(b.k)}
                    className={`flex-shrink-0 px-3 py-2.5 sm:px-4 sm:py-2 md:px-6 md:py-3 rounded-lg text-xs sm:text-sm md:text-base font-medium transition-all duration-200 min-h-[44px] whitespace-nowrap flex items-center gap-2 outline-none focus:outline-none focus:ring-0 ${
                      sensor === b.k
                        ? `bg-gradient-to-r ${b.activeClass} text-white shadow-lg`
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md"
                    }`}
                  >
                    <b.icon className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 ${sensor === b.k ? 'text-white' : 'text-gray-600'}`} />
                    {b.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Time Range Stats */}
            <div className="mb-4 sm:mb-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <TimeRangeStats
                  data={
                    sensor === "temperature" ? tempData :
                    sensor === "light" ? (lightData as any) :
                    sensor === "distance" ? (distanceData as any) :
                    sensor === "gps" ? (gpsData as any) :
                    (gasData as any)
                  }
                  selectedTimeRange={selectedTimeRange}
                  onTimeRangeChange={(m) => {
                    setSelectedTimeRange(m);
                    setCustomStartDate(null);
                    setCustomEndDate(null);
                  }}
                  unitLabel={unitLabel[sensor]}
                  sensorType={sensor}
                  onDateRangeChange={(s, e) => {
                    setCustomStartDate(s);
                    setCustomEndDate(e);
                  }}
                  onClearDateRange={() => {
                    setCustomStartDate(null);
                    setCustomEndDate(null);
                  }}
                />
                <RelayController />
              </div>
            </div>

            {/* AI Activity Monitor */}
            {systemStatus && (
              <motion.div
                className="mb-4 sm:mb-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-3 sm:p-4 lg:p-6 border border-purple-200 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2 flex-wrap">
                  <FaRobot className="text-purple-600" />
                  AI Activity Monitor
                  <motion.span
                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      systemStatus.isRunning
                        ? systemStatus.systemHealth === 'healthy' ? 'bg-green-100 text-green-800'
                        : systemStatus.systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {systemStatus.isRunning ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Active
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Inactive
                      </>
                    )}
                  </motion.span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm">
                  <motion.div className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow" whileHover={{ scale: 1.05 }}>
                    <div className="text-gray-600 text-xs">Sensors</div>
                    <div className="text-lg font-semibold text-blue-600">{systemStatus.sensorsConnected}</div>
                  </motion.div>
                  <motion.div className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow" whileHover={{ scale: 1.05 }}>
                    <div className="text-gray-600 text-xs">Active Alerts</div>
                    <div className={`text-lg font-semibold ${systemStatus.activeAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {systemStatus.activeAlerts}
                    </div>
                  </motion.div>
                  <motion.div className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow" whileHover={{ scale: 1.05 }}>
                    <div className="text-gray-600 text-xs">Uptime</div>
                    <div className="text-lg font-semibold text-purple-600">
                      {Math.floor(systemStatus.uptime / 1000)}s
                    </div>
                  </motion.div>
                  <motion.div className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow" whileHover={{ scale: 1.05 }}>
                    <div className="text-gray-600 text-xs">Health</div>
                    <div className={`text-lg font-semibold ${
                      systemStatus.systemHealth === 'healthy' ? 'text-green-600' :
                      systemStatus.systemHealth === 'warning' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {systemStatus.systemHealth}
                    </div>
                  </motion.div>
                  {systemStatus.detectorMetrics && (
                    <>
                      <motion.div className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow" whileHover={{ scale: 1.05 }}>
                        <div className="text-gray-600 text-xs">Latest Error</div>
                        <div className="text-lg font-semibold text-amber-600">
                          {systemStatus.detectorMetrics.latestError === null ? '—' : systemStatus.detectorMetrics.latestError.toFixed(4)}
                        </div>
                      </motion.div>
                      <motion.div className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow" whileHover={{ scale: 1.05 }}>
                        <div className="text-gray-600 text-xs">Global Threshold</div>
                        <div className="text-lg font-semibold text-amber-700">
                          {systemStatus.detectorMetrics.globalThreshold.toFixed(4)}
                        </div>
                      </motion.div>
                      <motion.div className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow" whileHover={{ scale: 1.05 }}>
                        <div className="text-gray-600 text-xs">Sensor Threshold</div>
                        <div className="text-lg font-semibold text-cyan-700">
                          {(systemStatus.detectorMetrics.sensorThresholds?.[sensor] ?? 0).toFixed(4)}
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>

                {alerts.length > 0 && (
                  <motion.div className="mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Alerts (AI Only):</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {alerts
                        .filter(alert => {
                          if (alert.source === 'point_detection') return false;
                          if (alert.source === 'ai_model') return true;
                          return !alert.message.includes('Spike tại');
                        })
                        .slice(-3)
                        .map((alert) => (
                          <motion.div
                            key={alert.id ?? `${alert.sensorType}-${alert.timestamp}`}
                            className={`text-xs p-2 rounded ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              alert.severity === 'high' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                          >
                            <span className="font-medium">{alert.sensorType}:</span> {alert.message}
                          </motion.div>
                        ))}
                      {alerts.filter(alert => {
                        if (alert.source === 'point_detection') return false;
                        if (alert.source === 'ai_model') return true;
                        return !alert.message.includes('Spike tại');
                      }).length === 0 && (
                        <div className="text-xs text-gray-500 text-center py-2">No AI alerts</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Charts */}
            <motion.div
              className="mb-4 sm:mb-6 lg:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <MdShowChart className="text-red-600" />
                  Biểu đồ dữ liệu
                </h3>
                <p className="text-xs text-gray-500 mb-2 sm:mb-3">Dữ liệu real-time từ cảm biến</p>
                <div className="h-48 sm:h-64 md:h-80 lg:h-96 w-full overflow-x-auto">
                  {sensor === "temperature" && (
                    <TemperatureChart
                      data={mergedTempData}
                      highlightTimestamp={latestAlert?.sensorType === 'temperature' ? latestAlert.timestamp : undefined}
                    />
                  )}
                  {sensor === "light" && (
                    <LightChart
                      data={filteredLight}
                      highlightTimestamp={latestAlert?.sensorType === 'light' ? latestAlert.timestamp : undefined}
                    />
                  )}
                  {sensor === "distance" && (
                    <DistanceChart
                      data={filteredDistance}
                      highlightTimestamp={latestAlert?.sensorType === 'distance' ? latestAlert.timestamp : undefined}
                    />
                  )}
                  {sensor === "gps" && <GpsChart data={filteredGps} />}
                  {sensor === "gas" && <GasChart data={filteredGas} />}
                </div>
              </div>
            </motion.div>

            {/* Special sections */}
            {sensor === "gps" && (
              <div className="mb-4 sm:mb-6 lg:mb-8">
                <FreeGpsMap data={filteredGps} />
              </div>
            )}
            {sensor === "gas" && (
              <div className="mb-4 sm:mb-6 lg:mb-8">
                <GasDashboard data={filteredGas} />
              </div>
            )}

            {/* Tables */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <HiClipboard className="text-amber-600" />
                    Bảng dữ liệu
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto -mx-3 sm:mx-0">
                  {sensor === "temperature" && <TemperatureTable rows={reversedTemp} />}
                  {sensor === "light" && <LightTable rows={reversedLight} />}
                  {sensor === "distance" && <DistanceTable rows={reversedDistance} />}
                  {sensor === "gps" && <GpsTable rows={reversedGps} />}
                  {sensor === "gas" && <GasTable rows={reversedGas} />}
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </motion.div>
  );
}
