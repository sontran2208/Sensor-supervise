// src/dev/mock.ts
export type TemperaturePoint = {
    timestamp: number;   // ms since epoch
    value: number;       // °C
  };
  
  // Tạo dữ liệu giả theo phút gần nhất
  export function genMockData(
    minutes = 60,
    base = 28,
    amplitude = 2,
    noise = 0.6
  ): TemperaturePoint[] {
    const now = Date.now();
    const arr: TemperaturePoint[] = [];
    for (let i = minutes - 1; i >= 0; i--) {
      const t = now - i * 60_000;
      // sóng nhẹ theo chu kỳ + nhiễu
      const wave = Math.sin((i / minutes) * Math.PI * 2) * amplitude;
      const n = (Math.random() - 0.5) * 2 * noise;
      arr.push({ timestamp: t, value: +(base + wave + n).toFixed(2) });
    }
    return arr;
  }
  
  // Tạo điểm mới mỗi n giây để mô phỏng realtime
  export function nextPoint(prev: TemperaturePoint, base = 28, amplitude = 2, noise = 0.6): TemperaturePoint {
    const t = prev.timestamp + 60_000; // mỗi phút có 1 điểm (bạn có thể đổi)
    const wave = Math.sin((t / 60_000 / 60) * Math.PI * 2) * amplitude;
    const n = (Math.random() - 0.5) * 2 * noise;
    return { timestamp: t, value: +(base + wave + n).toFixed(2) };
  }
  