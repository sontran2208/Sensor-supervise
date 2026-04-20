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
          disabled={loading || updating || state === "ON" || !!error}
          onClick={() => handleSetRelay("ON")}
          className={`rounded-lg px-4 py-3 font-semibold transition-all ${
            state === "ON"
              ? "bg-green-600 text-white shadow-lg"
              : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50"
          }`}
        >
          Bật (ON)
        </button>
        <button
          type="button"
          disabled={loading || updating || state === "OFF" || !!error}
          onClick={() => handleSetRelay("OFF")}
          className={`rounded-lg px-4 py-3 font-semibold transition-all ${
            state === "OFF"
              ? "bg-gray-700 text-white shadow-lg"
              : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
          }`}
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

