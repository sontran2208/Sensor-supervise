import type { GasDoc } from '../hooks/useGas';
import { FaWind } from 'react-icons/fa';
import { HiCheckCircle, HiExclamationCircle, HiBell } from 'react-icons/hi';

interface Props {
  data: GasDoc[];
}

export default function GasDashboard({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FaWind className="text-4xl mx-auto mb-2 text-gray-400" />
          <p>No gas sensor data available</p>
        </div>
      </div>
    );
  }

  const latest = data[data.length - 1]; // Lấy giá trị mới nhất (data được sort tăng dần theo timestamp)
  
  // Hàm xác định mức độ gas dựa trên mq2_raw (0-4095 cho ESP32 ADC)
  const getGasLevel = (raw: number) => {
    if (raw < 500) return { 
      text: 'Low', 
      color: 'bg-green-500', 
      textColor: 'text-green-800',
      status: 'Normal',
      icon: <HiCheckCircle className="w-4 h-4" />
    };
    if (raw < 1500) return { 
      text: 'Medium', 
      color: 'bg-yellow-500', 
      textColor: 'text-yellow-800',
      status: 'Moderate',
      icon: <HiExclamationCircle className="w-4 h-4" />
    };
    if (raw < 3000) return { 
      text: 'High', 
      color: 'bg-orange-500', 
      textColor: 'text-orange-800',
      status: 'High',
      icon: <HiExclamationCircle className="w-4 h-4" />
    };
    return { 
      text: 'Very High', 
      color: 'bg-red-500', 
      textColor: 'text-red-800',
      status: 'Very High',
      icon: <HiBell className="w-4 h-4" />
    };
  };

  const gasLevel = getGasLevel(latest.mq2_raw);

  // Tính toán thống kê
  const values = data.map(d => d.mq2_raw);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="space-y-6">
      {/* MQ-2 Sensor Status */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaWind className="text-blue-600" />
          MQ-2 Gas Sensor Status
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${gasLevel.color} ${gasLevel.textColor}`}>
              {gasLevel.icon}
              <span className="text-lg font-bold">{latest.mq2_raw.toFixed(0)}</span>
              <span className="text-sm font-medium">{gasLevel.text}</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Raw ADC Value (0-4095)
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Last updated</div>
            <div className="text-sm font-medium">{new Date(latest.timestamp).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {latest.mq2_raw.toFixed(0)}
          </div>
          <div className="text-sm text-blue-800">Current Value</div>
          <div className="text-xs text-blue-600 mt-1 flex items-center justify-center gap-1">
            {gasLevel.icon}
            {gasLevel.status}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {avg.toFixed(0)}
          </div>
          <div className="text-sm text-green-800">Average</div>
          <div className="text-xs text-green-600 mt-1">
            Over {data.length} readings
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {min.toFixed(0)}
          </div>
          <div className="text-sm text-purple-800">Minimum</div>
          <div className="text-xs text-purple-600 mt-1">
            Lowest reading
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
          <div className="text-2xl font-bold text-red-600">
            {max.toFixed(0)}
          </div>
          <div className="text-sm text-red-800">Maximum</div>
          <div className="text-xs text-red-600 mt-1">
            Highest reading
          </div>
        </div>
      </div>

      {/* Safety Alerts */}
      {latest.mq2_raw >= 1500 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <HiExclamationCircle className="text-2xl mr-3 text-red-600" />
            <div>
              <h4 className="text-lg font-semibold text-red-800">Gas Level Alert</h4>
              <p className="text-sm text-red-700">
                High gas level detected (Raw value: {latest.mq2_raw.toFixed(0)}). 
                Please ensure proper ventilation and consider evacuation if necessary.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
