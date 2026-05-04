import { useCallback, useEffect, useMemo, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import toast from "react-hot-toast";
import { firebaseConfigured, rtdb } from "../firebase";
import { HiCog } from "react-icons/hi";

type RelayState = "ON" | "OFF";

const RELAY_PATH = "/relayControl";

export default function RelayController() {
  const [state, setState] = useState<RelayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnActive = state === "ON";
  const isOffActive = state === "OFF";

  useEffect(() => {
    if (!firebaseConfigured || !rtdb) {
      setLoading(false);
      setError("Firebase chưa được cấu hình trong dashboard.");
      return;
    }

    const relayRef = ref(rtdb, RELAY_PATH);
    const unsubscribe = onValue(
      relayRef,
      (snapshot) => {
        const value = String(snapshot.val() ?? "OFF").toUpperCase();
        setState(value === "ON" ? "ON" : "OFF");
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Không thể đọc trạng thái relay.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSetRelay = useCallback(
    async (nextState: RelayState) => {
      if (!firebaseConfigured || !rtdb) return;
      if (state === nextState || updating) return;

      setUpdating(true);
      try {
        await set(ref(rtdb, RELAY_PATH), nextState);
        toast.success(`Relay đã chuyển sang ${nextState}`);
      } catch (err: any) {
        toast.error("Không thể thay đổi trạng thái relay.");
        setError(err?.message || "Không thể thay đổi trạng thái relay.");
      } finally {
        setUpdating(false);
      }
    },
    [state, updating]
  );

  const statusBadge = useMemo(() => {
    if (state === "ON") return "bg-green-100 text-green-800";
    if (state === "OFF") return "bg-gray-100 text-gray-800";
    return "bg-yellow-100 text-yellow-800";
  }, [state]);

  const statusLabel = state ?? "Đang cập nhật...";

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <HiCog className="text-gray-700" />
            Relay Control
          </h3>
          <p className="text-sm text-gray-500">
            Điều khiển relay trực tiếp từ dashboard. Nếu bật tự động theo nhiệt độ/AI (
            <code className="bg-gray-100 rounded px-1 text-xs">VITE_RELAY_AUTOMATION</code>
            ), giá trị có thể bị ghi định kỳ theo luồng Edge AI.
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading || updating || isOnActive || !!error}
          onClick={() => handleSetRelay("ON")}
          className={`appearance-none rounded-lg border px-4 py-3 font-semibold transition-all ${
            isOnActive
              ? "shadow-lg"
              : "hover:bg-green-100"
          } ${loading || updating || !!error ? "disabled:cursor-not-allowed" : ""}`}
          style={{
            backgroundColor: isOnActive ? "#16a34a" : "#f0fdf4",
            color: isOnActive ? "#ffffff" : "#15803d",
            borderColor: isOnActive ? "#16a34a" : "#bbf7d0",
            opacity: isOnActive ? 1 : undefined,
            WebkitTextFillColor: isOnActive ? "#ffffff" : "#15803d",
            cursor: loading || updating || isOnActive || !!error ? "default" : "pointer",
          }}
        >
          Bật (ON)
        </button>
        <button
          type="button"
          disabled={loading || updating || isOffActive || !!error}
          onClick={() => handleSetRelay("OFF")}
          className={`appearance-none rounded-lg border px-4 py-3 font-semibold transition-all ${
            isOffActive
              ? "shadow-lg"
              : "hover:bg-gray-100"
          } ${loading || updating || !!error ? "disabled:cursor-not-allowed" : ""}`}
          style={{
            backgroundColor: isOffActive ? "#374151" : "#f9fafb",
            color: isOffActive ? "#ffffff" : "#374151",
            borderColor: isOffActive ? "#374151" : "#e5e7eb",
            opacity: isOffActive ? 1 : undefined,
            WebkitTextFillColor: isOffActive ? "#ffffff" : "#374151",
            cursor: loading || updating || isOffActive || !!error ? "default" : "pointer",
          }}
        >
          Tắt (OFF)
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        * Trạng thái lưu tại RTDB đường dẫn <code className="bg-gray-100 rounded px-1">/relayControl</code>, ESP32 sẽ đọc và cập nhật relay.
      </p>
    </div>
  );
}

