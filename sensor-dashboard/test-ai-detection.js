// Test script để verify AI detection logic
console.log('🧪 Testing AI Detection Logic...');

// Test case 1: Sensor disconnection (value = 0.5)
const testData1 = [
  { timestamp: Date.now() - 20000, value: 28.5, sensorType: 'temperature' },
  { timestamp: Date.now() - 15000, value: 29.0, sensorType: 'temperature' },
  { timestamp: Date.now() - 10000, value: 29.2, sensorType: 'temperature' },
  { timestamp: Date.now() - 5000, value: 29.5, sensorType: 'temperature' },
  { timestamp: Date.now(), value: 0.5, sensorType: 'temperature' } // Sensor disconnected
];

// Test case 2: Sudden drop (from 30°C to 5°C)
const testData2 = [
  { timestamp: Date.now() - 20000, value: 28.5, sensorType: 'temperature' },
  { timestamp: Date.now() - 15000, value: 29.0, sensorType: 'temperature' },
  { timestamp: Date.now() - 10000, value: 30.0, sensorType: 'temperature' },
  { timestamp: Date.now() - 5000, value: 30.2, sensorType: 'temperature' },
  { timestamp: Date.now(), value: 5.0, sensorType: 'temperature' } // Sudden drop
];

// Test case 3: Normal data
const testData3 = [
  { timestamp: Date.now() - 20000, value: 28.5, sensorType: 'temperature' },
  { timestamp: Date.now() - 15000, value: 29.0, sensorType: 'temperature' },
  { timestamp: Date.now() - 10000, value: 29.2, sensorType: 'temperature' },
  { timestamp: Date.now() - 5000, value: 29.5, sensorType: 'temperature' },
  { timestamp: Date.now(), value: 29.8, sensorType: 'temperature' } // Normal
];

console.log('📊 Test Case 1: Sensor Disconnection (0.5°C)');
console.log('Expected: CRITICAL anomaly - sensor_disconnected');
console.log('Data:', testData1);

console.log('\n📊 Test Case 2: Sudden Drop (30°C → 5°C)');
console.log('Expected: CRITICAL anomaly - sudden_drop');
console.log('Data:', testData2);

console.log('\n📊 Test Case 3: Normal Data');
console.log('Expected: No anomaly');
console.log('Data:', testData3);

console.log('\n✅ Test cases prepared. Run AI detection to verify results.');
