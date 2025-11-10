import type { GasDoc } from '../hooks/useGas';

interface Props {
  data: GasDoc[];
}

export default function GasDashboard({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🌬️</div>
          <p>No gas sensor data available</p>
        </div>
      </div>
    );
  }

  const latest = data[0];
  const getAirQualityStatus = (aqi: number) => {
    if (aqi <= 50) return { text: 'Good', color: 'bg-green-500', textColor: 'text-green-800' };
    if (aqi <= 100) return { text: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-800' };
    if (aqi <= 150) return { text: 'Unhealthy for Sensitive', color: 'bg-orange-500', textColor: 'text-orange-800' };
    if (aqi <= 200) return { text: 'Unhealthy', color: 'bg-red-500', textColor: 'text-red-800' };
    if (aqi <= 300) return { text: 'Very Unhealthy', color: 'bg-purple-500', textColor: 'text-purple-800' };
    return { text: 'Hazardous', color: 'bg-red-800', textColor: 'text-red-100' };
  };

  const aqiStatus = getAirQualityStatus(latest.airQuality);

  return (
    <div className="space-y-6">
      {/* Air Quality Status */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🌬️ Air Quality Status</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className={`inline-flex items-center px-4 py-2 rounded-full ${aqiStatus.color} ${aqiStatus.textColor}`}>
              <span className="text-lg font-bold">{latest.airQuality.toFixed(0)}</span>
              <span className="ml-2 text-sm font-medium">{aqiStatus.text}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Last updated</div>
            <div className="text-sm font-medium">{new Date(latest.timestamp).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Gas Levels Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
          <div className="text-2xl font-bold text-red-600">
            {latest.co.toFixed(1)}
          </div>
          <div className="text-sm text-red-800">CO (ppm)</div>
          <div className="text-xs text-red-600 mt-1">
            {latest.co > 9 ? '⚠️ High' : '✅ Normal'}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {latest.co2.toFixed(0)}
          </div>
          <div className="text-sm text-blue-800">CO2 (ppm)</div>
          <div className="text-xs text-blue-600 mt-1">
            {latest.co2 > 1000 ? '⚠️ High' : '✅ Normal'}
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">
            {latest.smoke.toFixed(1)}
          </div>
          <div className="text-sm text-yellow-800">Smoke</div>
          <div className="text-xs text-yellow-600 mt-1">
            {latest.smoke > 300 ? '⚠️ High' : '✅ Normal'}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {latest.lpg.toFixed(1)}
          </div>
          <div className="text-sm text-green-800">LPG</div>
          <div className="text-xs text-green-600 mt-1">
            {latest.lpg > 200 ? '⚠️ High' : '✅ Normal'}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {latest.methane.toFixed(1)}
          </div>
          <div className="text-sm text-purple-800">Methane</div>
          <div className="text-xs text-purple-600 mt-1">
            {latest.methane > 1000 ? '⚠️ High' : '✅ Normal'}
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-200">
          <div className="text-2xl font-bold text-indigo-600">
            {latest.hydrogen.toFixed(1)}
          </div>
          <div className="text-sm text-indigo-800">Hydrogen</div>
          <div className="text-xs text-indigo-600 mt-1">
            {latest.hydrogen > 100 ? '⚠️ High' : '✅ Normal'}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">
            {latest.temperature.toFixed(1)}°C
          </div>
          <div className="text-sm text-gray-800">Temperature</div>
          <div className="text-xs text-gray-600 mt-1">
            {latest.temperature > 30 ? '🌡️ Hot' : latest.temperature < 10 ? '❄️ Cold' : '🌤️ Normal'}
          </div>
        </div>

        <div className="bg-cyan-50 rounded-lg p-4 text-center border border-cyan-200">
          <div className="text-2xl font-bold text-cyan-600">
            {latest.humidity.toFixed(1)}%
          </div>
          <div className="text-sm text-cyan-800">Humidity</div>
          <div className="text-xs text-cyan-600 mt-1">
            {latest.humidity > 70 ? '💧 Humid' : latest.humidity < 30 ? '🏜️ Dry' : '🌤️ Normal'}
          </div>
        </div>
      </div>

      {/* Safety Alerts */}
      {(latest.co > 9 || latest.co2 > 1000 || latest.smoke > 300 || latest.lpg > 200) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚠️</div>
            <div>
              <h4 className="text-lg font-semibold text-red-800">Safety Alert</h4>
              <p className="text-sm text-red-700">
                High levels of dangerous gases detected. Please ensure proper ventilation and consider evacuation if necessary.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
