# BÀI TRẢ LỜI CÁC CÂU HỎI VỀ DỰ ÁN SENSOR SUPERVISOR

## CÂU 1: THÔNG TIN VỀ CẢM BIẾN

### 1.1. Dự án sử dụng loại cảm biến nào?

Dự án **Sensor Supervisor** sử dụng **5 loại cảm biến** chính:

1. **DHT22 - Cảm biến nhiệt độ (Temperature Sensor)**
   - Model: DHT22 (AM2302)
   - Giao thức: 1-wire
   - Đơn vị: °C (độ Celsius)
   - Collection trong Firebase: `temperature`

2. **BH1750 - Cảm biến ánh sáng (Light Sensor)**
   - Model: BH1750FVI
   - Giao thức: I2C
   - Đơn vị: lx (lux)
   - Collection trong Firebase: `light`

3. **HC-SR04 - Cảm biến khoảng cách (Distance Sensor)**
   - Model: HC-SR04
   - Giao thức: Digital (PWM)
   - Đơn vị: cm (centimeters)
   - Collection trong Firebase: `distance`

4. **GPS NEO-6M - Cảm biến GPS (Global Positioning System)**
   - Model: NEO-6M
   - Giao thức: UART (Serial)
   - Đơn vị: 
     - Latitude/Longitude: độ thập phân
     - Speed: m/s hoặc km/h
     - Altitude: mét
   - Collection trong Firebase: `gps_data`

5. **MQ-2/MQ-135 - Cảm biến khí gas (Gas Sensor)**
   - Model: MQ-2 hoặc MQ-135
   - Giao thức: Analog (ADC)
   - Đo nhiều loại khí:
     - CO (Carbon Monoxide): ppm
     - CO2 (Carbon Dioxide): ppm
     - Smoke: đơn vị tùy chỉnh
     - LPG (Liquefied Petroleum Gas): ppm
     - Methane: ppm
     - Hydrogen: ppm
     - Air Quality Index (AQI): 0-500
   - Collection trong Firebase: `gas_data`

**Chứng minh trong code:**
- File `src/App.tsx` dòng 28: `type Sensor = "temperature" | "light" | "distance" | "gps" | "gas";`
- File `src/firebase.ts` định nghĩa các type: `TemperatureRecord`, `LightRecord`, `DistanceRecord`
- File `src/hooks/useGas.ts` định nghĩa `GasDoc` với các trường: co, co2, smoke, lpg, methane, hydrogen, airQuality

---

### 1.2. Nguyên lý của cảm biến trong dự án

#### **DHT22 - Cảm biến nhiệt độ (Temperature Sensor)**
- **Nguyên lý:** DHT22 sử dụng cảm biến nhiệt độ và độ ẩm tích hợp, hoạt động theo giao thức 1-wire
- **Hoạt động:** 
  - Cảm biến sử dụng thermistor để đo nhiệt độ
  - Giao tiếp 1-wire: ESP32 gửi tín hiệu start, DHT22 phản hồi với 40-bit data (16-bit nhiệt độ, 16-bit độ ẩm, 8-bit checksum)
  - Nhiệt độ được tính từ dữ liệu raw: `Temperature = (data[2] << 8 | data[3]) / 10.0`
- **Thông số kỹ thuật:**
  - Dải đo nhiệt độ: -40°C đến 80°C
  - Độ chính xác: ±0.5°C
  - Độ phân giải: 0.1°C
- **Ứng dụng trong dự án:** Đo nhiệt độ môi trường, phát hiện bất thường khi nhiệt độ tăng/giảm đột ngột

#### **BH1750 - Cảm biến ánh sáng (Light Sensor)**
- **Nguyên lý:** BH1750 là cảm biến ánh sáng kỹ thuật số sử dụng photodiode, giao tiếp qua I2C
- **Hoạt động:** 
  - Photodiode chuyển đổi ánh sáng thành dòng điện
  - IC tích hợp ADC 16-bit chuyển đổi thành giá trị số
  - Giao tiếp I2C: ESP32 đọc dữ liệu từ địa chỉ I2C (0x23 hoặc 0x5C)
  - Giá trị lux được tính: `Lux = (data[0] << 8 | data[1]) / 1.2`
- **Thông số kỹ thuật:**
  - Dải đo: 1-65535 lx
  - Độ phân giải: 1 lx
  - Độ chính xác: ±20%
- **Ứng dụng trong dự án:** Đo độ sáng môi trường, phát hiện thay đổi ánh sáng bất thường

#### **HC-SR04 - Cảm biến khoảng cách (Distance Sensor)**
- **Nguyên lý:** HC-SR04 là cảm biến siêu âm sử dụng sóng siêu âm để đo khoảng cách
- **Hoạt động:** 
  - ESP32 gửi xung trigger (10µs HIGH) đến chân Trig
  - HC-SR04 phát sóng siêu âm 40kHz
  - Khi sóng phản xạ về, chân Echo trả về xung HIGH với độ rộng tỷ lệ với khoảng cách
  - ESP32 đo thời gian xung Echo (Time of Flight)
  - Khoảng cách: `Distance(cm) = (Time_of_Flight(µs) × 0.0343) / 2`
- **Thông số kỹ thuật:**
  - Dải đo: 2-400 cm
  - Độ chính xác: ±3mm
  - Góc đo: 15°
- **Ứng dụng trong dự án:** Đo khoảng cách vật thể, phát hiện vật cản

#### **GPS NEO-6M - Cảm biến GPS**
- **Nguyên lý:** Module GPS NEO-6M nhận tín hiệu từ vệ tinh GPS, giao tiếp qua UART
- **Hoạt động:** 
  - Module GPS nhận tín hiệu từ ít nhất 4 vệ tinh GPS
  - Chipset u-blox NEO-6M xử lý tín hiệu và tính toán vị trí bằng phương pháp trilateration
  - Dữ liệu được truyền qua UART dưới dạng chuỗi NMEA (National Marine Electronics Association)
  - ESP32 parse chuỗi NMEA để lấy: latitude, longitude, speed, altitude, số vệ tinh
  - Format NMEA: `$GPGGA,time,lat,N/S,lon,E/W,quality,numSV,HDOP,alt,M,sep,M,diffAge,diffStation*checksum`
- **Thông số kỹ thuật:**
  - Độ chính xác: ±2.5m (với 4+ vệ tinh)
  - Tần suất cập nhật: 1Hz (1 lần/giây)
  - Độ nhạy: -161 dBm
- **Ứng dụng trong dự án:** Theo dõi vị trí, tốc độ di chuyển, phát hiện bất thường về tốc độ

#### **MQ-2/MQ-135 - Cảm biến khí gas (Gas Sensor)**
- **Nguyên lý:** Cảm biến MQ series sử dụng chất bán dẫn SnO2, điện trở thay đổi khi tiếp xúc với khí gas
- **Hoạt động:** 
  - Khi có khí gas, điện trở của SnO2 giảm
  - Tạo ra điện áp tương tự (analog) tại chân A0
  - ESP32 đọc điện áp qua ADC (Analog-to-Digital Converter)
  - Nồng độ khí được tính: `Gas_ppm = (Rs / R0) × K_gas`
  - Với:
    - `Rs`: Điện trở cảm biến khi có khí = `(Vcc - Vout) / Vout × RL`
    - `R0`: Điện trở cảm biến trong không khí sạch (đo khi hiệu chuẩn)
    - `K_gas`: Hệ số hiệu chuẩn cho từng loại khí (từ datasheet)
- **Thông số kỹ thuật:**
  - MQ-2: Phát hiện LPG, propane, hydrogen, CO, alcohol, smoke
  - MQ-135: Phát hiện CO2, NH3, NOx, alcohol, benzene, smoke, CO
  - Dải đo: 200-10000 ppm (tùy loại khí)
  - Độ nhạy: 0.1-10 ppm (tùy loại khí)
- **Ứng dụng trong dự án:** Phát hiện rò rỉ khí gas, đo chất lượng không khí, cảnh báo nguy hiểm

**Chứng minh trong code:**
- File `src/firebase.ts` định nghĩa các type dữ liệu cảm biến
- File `src/hooks/useGas.ts` định nghĩa `GasDoc` với các trường khí gas
- File `src/App.tsx` xử lý dữ liệu từ các cảm biến

---

### 1.3. Đầu ra của cảm biến là tín hiệu dạng đại lượng nào?

Tất cả các cảm biến trong dự án đều có **đầu ra là tín hiệu số (Digital Signal)** sau khi được xử lý bởi vi điều khiển (ESP32/ESP8266):

1. **DHT22 - Temperature Sensor:**
   - Đầu ra: **Số thực** (float) - từ giao thức 1-wire
   - Đơn vị: °C
   - Độ phân giải: 0.1°C
   - Ví dụ: `27.5`, `30.2`

2. **BH1750 - Light Sensor:**
   - Đầu ra: **Số nguyên** (integer) - từ I2C
   - Đơn vị: lx
   - Độ phân giải: 1 lx
   - Ví dụ: `600`, `850`

3. **HC-SR04 - Distance Sensor:**
   - Đầu ra: **Số thực** (float) - từ phép đo thời gian echo
   - Đơn vị: cm
   - Độ phân giải: ~0.3mm
   - Ví dụ: `120.5`, `95.3`

4. **GPS NEO-6M - GPS Sensor:**
   - Đầu ra: **Đối tượng JSON** - từ parse chuỗi NMEA qua UART
   - Các trường:
     - `latitude`: số thực (float) - độ thập phân
     - `longitude`: số thực (float) - độ thập phân
     - `speed`: số thực (float) - m/s hoặc km/h
     - `altitude`: số thực (float) - mét
     - `accuracy`: số thực (float) - mét
     - `satellites`: số nguyên (integer) - số vệ tinh

5. **MQ-2/MQ-135 - Gas Sensor:**
   - Đầu ra: **Đối tượng JSON** - từ đọc ADC và tính toán ppm
   - Các trường:
     - `co`: số thực (float) - ppm (Carbon Monoxide)
     - `co2`: số thực (float) - ppm (Carbon Dioxide)
     - `smoke`: số thực (float) - đơn vị tùy chỉnh
     - `lpg`: số thực (float) - ppm (Liquefied Petroleum Gas)
     - `methane`: số thực (float) - ppm
     - `hydrogen`: số thực (float) - ppm
     - `airQuality`: số nguyên (integer) - AQI 0-500

**Chứng minh trong code:**
- File `src/firebase.ts`:
  ```typescript
  export type TemperatureRecord = {
    timestamp: number;
    value: number; // temperature in Celsius
  };
  ```
- File `src/hooks/useGas.ts`:
  ```typescript
  export interface GasDoc {
    co: number;        // Carbon Monoxide (ppm)
    co2: number;       // Carbon Dioxide (ppm)
    smoke: number;
    // ...
  }
  ```

---

### 1.4. Khoảng giá trị min-max của đại lượng

Dựa trên thông số kỹ thuật của các cảm biến và dữ liệu thực tế trong dự án:

#### **DHT22 - Temperature Sensor:**
- **Min:** -40°C (theo datasheet DHT22)
- **Max:** 80°C (theo datasheet DHT22)
- **Giá trị bình thường:** 20-30°C (nhiệt độ phòng)
- **Chứng minh:** DHT22 có dải đo -40°C đến 80°C theo datasheet. Trong môi trường thực tế, nhiệt độ phòng thường 20-40°C

#### **BH1750 - Light Sensor:**
- **Min:** 1 lx (theo datasheet BH1750)
- **Max:** 65535 lx (giới hạn của BH1750)
- **Giá trị bình thường:** 
  - Trong nhà: 100-500 lx
  - Ngoài trời: 1000-10000 lx
  - Ánh sáng mặt trời trực tiếp: 10000-100000 lx (nhưng BH1750 chỉ đo đến 65535 lx)
- **Chứng minh:** BH1750 có dải đo 1-65535 lx theo datasheet

#### **HC-SR04 - Distance Sensor:**
- **Min:** 2 cm (giới hạn tối thiểu của HC-SR04)
- **Max:** 400 cm (giới hạn tối đa của HC-SR04)
- **Giá trị bình thường:** 10-300 cm (trong phạm vi hoạt động tốt)
- **Chứng minh:** HC-SR04 có dải đo 2-400 cm theo datasheet

#### **GPS NEO-6M - GPS Sensor:**
- **Latitude:** -90 đến +90 độ (theo chuẩn GPS)
- **Longitude:** -180 đến +180 độ (theo chuẩn GPS)
- **Speed:** 0-100 m/s (0-360 km/h) - được clamp trong code để loại bỏ giá trị bất thường
- **Altitude:** 0-8848+ mét (tùy vị trí địa lý)
- **Accuracy:** 2.5-10 mét (tùy số vệ tinh)
- **Satellites:** 0-12+ (số vệ tinh nhìn thấy)
- **Chứng minh:** File `src/App.tsx` dòng 34: `const GPS_MAX_MPS = 100; // clamp vật lý ~360 km/h`

#### **MQ-2/MQ-135 - Gas Sensor:**
- **CO (Carbon Monoxide):** 0-1000+ ppm (MQ-2, MQ-135)
- **CO2 (Carbon Dioxide):** 400-10000+ ppm (MQ-135)
- **Smoke:** 0-500+ (đơn vị tùy chỉnh)
- **LPG (Liquefied Petroleum Gas):** 0-10000+ ppm (MQ-2)
- **Methane:** 0-2000+ ppm (MQ-2, MQ-135)
- **Hydrogen:** 0-1000+ ppm (MQ-2)
- **Air Quality Index (AQI):** 0-500 (chuẩn AQI)
- **Chứng minh:** MQ-2 và MQ-135 có dải đo khác nhau tùy loại khí theo datasheet. Air Quality Index (AQI) chuẩn là 0-500

---

### 1.5. Phương trình ánh xạ giá trị đại lượng đầu ra của cảm biến và đại lượng cần đo

#### **DHT22 - Temperature Sensor:**
DHT22 sử dụng giao thức 1-wire, trả về dữ liệu số trực tiếp:
```
// ESP32 đọc 40-bit data từ DHT22
raw_data = read_dht22()  // 40 bits: [humidity_high, humidity_low, temp_high, temp_low, checksum]

// Chuyển đổi sang nhiệt độ
Temperature(°C) = ((raw_data[2] << 8) | raw_data[3]) / 10.0
```
Ví dụ: Nếu raw_data[2] = 0x01, raw_data[3] = 0x0F (271 decimal) → Temperature = 27.1°C

**Trong dự án:** ESP32 đọc DHT22, chuyển đổi sang °C, gửi lên Firebase: `value = temperature_in_celsius`

**Chứng minh:** File `src/firebase.ts` dòng 67: `value: number; // temperature in Celsius`

#### **BH1750 - Light Sensor:**
BH1750 trả về giá trị số trực tiếp qua I2C:
```
// ESP32 đọc 2 bytes từ BH1750 (địa chỉ I2C: 0x23)
raw_data = i2c_read(BH1750_ADDR, 2)  // [high_byte, low_byte]

// Chuyển đổi sang lux
Lux = ((raw_data[0] << 8) | raw_data[1]) / 1.2
```
Ví dụ: Nếu raw_data[0] = 0x02, raw_data[1] = 0x58 (600 decimal) → Lux = 600 / 1.2 = 500 lx

**Trong dự án:** ESP32 đọc BH1750 qua I2C, tính lux, gửi lên Firebase: `value = illuminance_in_lux`

**Chứng minh:** File `src/firebase.ts` dòng 72: `value: number; // illuminance in lux`

#### **HC-SR04 - Distance Sensor:**
HC-SR04 sử dụng xung digital, ESP32 đo thời gian:
```
// ESP32 gửi trigger pulse (10µs HIGH)
digitalWrite(TRIG_PIN, HIGH);
delayMicroseconds(10);
digitalWrite(TRIG_PIN, LOW);

// Đo thời gian echo pulse
time_of_flight = pulseIn(ECHO_PIN, HIGH);  // microseconds

// Tính khoảng cách
// Tốc độ âm thanh ≈ 343 m/s = 0.0343 cm/µs ở 20°C
Distance(cm) = (time_of_flight(µs) × 0.0343) / 2
```
Ví dụ: Nếu time_of_flight = 7000µs → Distance = (7000 × 0.0343) / 2 = 120.05 cm

**Trong dự án:** ESP32 đo thời gian echo, tính khoảng cách, gửi lên Firebase: `value = distance_in_centimeters`

**Chứng minh:** File `src/firebase.ts` dòng 77: `value: number; // distance in centimeters`

#### **GPS NEO-6M - GPS Sensor:**
GPS NEO-6M trả về chuỗi NMEA qua UART, ESP32 parse:
```
// GPS gửi chuỗi NMEA qua Serial (UART)
// Ví dụ: $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47

// Parse chuỗi NMEA
Latitude = parse_NMEA_lat(nmea_string)   // Độ thập phân
Longitude = parse_NMEA_lon(nmea_string)  // Độ thập phân
Speed(km/h) = parse_NMEA_speed(nmea_string)
Altitude(m) = parse_NMEA_alt(nmea_string)

// Chuyển đổi speed nếu cần
Speed(m/s) = Speed(km/h) / 3.6
```
**Trong dự án:** File `src/App.tsx` dòng 203:
```typescript
const speedMps = rawSpeed > 40 ? rawSpeed / 3.6 : rawSpeed; // km/h → m/s
```

**Chứng minh:** File `src/hooks/useGps.ts` định nghĩa `GpsDoc` với latitude, longitude, speed, altitude

#### **MQ-2/MQ-135 - Gas Sensor:**
MQ series sử dụng analog output, ESP32 đọc qua ADC:
```
// ESP32 đọc điện áp analog từ chân A0
adc_value = analogRead(GAS_SENSOR_PIN);  // 0-4095 (12-bit ADC trên ESP32)
voltage = (adc_value / 4095.0) × Vcc;     // Vcc = 3.3V

// Tính điện trở cảm biến
// RL (load resistor) = 10kΩ (thường dùng)
Rs = ((Vcc - voltage) / voltage) × RL

// Tính nồng độ khí (ppm)
// R0: Điện trở trong không khí sạch (đo khi hiệu chuẩn)
// K_gas: Hệ số từ datasheet (ví dụ: CO = 4.4, LPG = 2.3)
Gas_ppm = pow(10, ((log10(Rs/R0) - log10(K_gas)) / slope))

// Hoặc công thức đơn giản hơn (linear approximation):
Gas_ppm = (Rs / R0) × K_gas
```
Ví dụ với MQ-2 đo LPG: Nếu Rs = 5000Ω, R0 = 10000Ω, K_LPG = 2.3 → LPG_ppm = (5000/10000) × 2.3 = 1.15 ppm

**Trong dự án:** ESP32 đọc ADC, tính ppm cho từng loại khí, gửi lên Firebase: `co = value_in_ppm`, `co2 = value_in_ppm`, etc.

**Chứng minh:** File `src/hooks/useGas.ts` dòng 7-14: định nghĩa các trường `co`, `co2`, `smoke`, `lpg`, `methane`, `hydrogen`, `airQuality`

---

## CÂU 2: GIAO THỨC LỚP 4 (TRANSPORT LAYER)

### 2.1. Giao thức lớp 4 của dự án là gì?

Dự án sử dụng **TCP (Transmission Control Protocol)** làm giao thức lớp 4 (Transport Layer).

### 2.2. Phân tích ưu nhược điểm của TCP

#### **Ưu điểm:**
1. **Đảm bảo độ tin cậy (Reliability):**
   - Đảm bảo dữ liệu được truyền đầy đủ, không mất mát
   - Có cơ chế ACK (Acknowledgement) và retransmission
   - Phù hợp với dữ liệu cảm biến quan trọng

2. **Đảm bảo thứ tự (Ordering):**
   - Dữ liệu được truyền theo đúng thứ tự
   - Quan trọng cho dữ liệu cảm biến có timestamp

3. **Kiểm soát luồng (Flow Control):**
   - Tránh tràn bộ đệm
   - Điều chỉnh tốc độ truyền phù hợp

4. **Kiểm soát tắc nghẽn (Congestion Control):**
   - Tự động điều chỉnh khi mạng bị tắc nghẽn
   - Đảm bảo hiệu suất ổn định

#### **Nhược điểm:**
1. **Overhead lớn:**
   - Header TCP 20 bytes (so với UDP 8 bytes)
   - Tăng kích thước gói tin

2. **Độ trễ cao hơn UDP:**
   - Cần thiết lập kết nối (3-way handshake)
   - Có cơ chế retransmission gây delay

3. **Tốn tài nguyên:**
   - Cần duy trì trạng thái kết nối
   - Tốn bộ nhớ và CPU hơn UDP

### 2.3. Chứng minh sản phẩm dự án đã dùng giao thức TCP

**Chứng minh 1: Firebase Firestore sử dụng TCP**
- Firebase Firestore sử dụng **gRPC** (gRPC Remote Procedure Calls) hoặc **HTTP/HTTPS REST API**
- Cả gRPC và HTTP/HTTPS đều chạy trên **TCP**
- File `sensor-dashboard/functions/package-lock.json` có dependency `@grpc/grpc-js` chứng minh sử dụng gRPC

**Chứng minh 2: Code sử dụng Firebase SDK**
- File `src/firebase.ts`:
  ```typescript
  import { initializeApp, getApps } from 'firebase/app';
  import { getFirestore } from 'firebase/firestore';
  ```
- Firebase SDK mặc định sử dụng HTTP/HTTPS (TCP) để kết nối với Firestore

**Chứng minh 3: WebSocket (nếu có) cũng dùng TCP**
- Firebase Realtime Database có thể dùng WebSocket, nhưng WebSocket cũng chạy trên TCP
- File `src/hooks/useTemperatureFeed.ts` sử dụng `onSnapshot` - đây là real-time listener của Firestore, sử dụng WebSocket over TCP

**Chứng minh 4: Kiểm tra bằng network tools**
- Có thể sử dụng Wireshark hoặc Chrome DevTools Network tab để xác nhận:
  - Protocol: TCP
  - Port: 443 (HTTPS) hoặc 80 (HTTP)
  - Destination: `firestore.googleapis.com` hoặc `*.firebaseio.com`

**Chứng minh 5: Package.json dependencies**
- File `package.json` có `"firebase": "^12.3.0"` - Firebase SDK sử dụng TCP/IP stack của Node.js/Browser

---

## CÂU 3: GIAO THỨC LỚP ỨNG DỤNG (APPLICATION LAYER)

### 3.1. Giao thức lớp ứng dụng của nhóm là gì?

Dự án sử dụng **Firebase Firestore REST API** và **gRPC** làm giao thức lớp ứng dụng.

### 3.2. Các phương thức của giao thức

#### **Firebase Firestore REST API:**

1. **GET** - Đọc dữ liệu:
   - `GET /v1/projects/{project_id}/databases/{database_id}/documents/{collection}/{document_id}`
   - Sử dụng trong: `useTemperatureFeed.ts`, `useLightFeed.ts`, etc.

2. **POST** - Tạo mới document:
   - `POST /v1/projects/{project_id}/databases/{database_id}/documents/{collection}`
   - Sử dụng trong: ESP32 gửi dữ liệu cảm biến lên Firestore với `addDoc()`

3. **PATCH** - Cập nhật document:
   - `PATCH /v1/projects/{project_id}/databases/{database_id}/documents/{collection}/{document_id}`

4. **DELETE** - Xóa document:
   - `DELETE /v1/projects/{project_id}/databases/{database_id}/documents/{collection}/{document_id}`

5. **LISTEN** - Real-time listener (WebSocket):
   - `onSnapshot()` tạo WebSocket connection để nhận updates real-time

#### **gRPC Methods:**
- `Listen` - Stream documents
- `GetDocument` - Get single document
- `CreateDocument` - Create new document
- `UpdateDocument` - Update document
- `DeleteDocument` - Delete document
- `ListDocuments` - List documents in collection

### 3.3. Cấu trúc khung dữ liệu của giao thức

#### **Firebase Firestore REST API Request Format:**

**HTTP Request:**
```
POST /v1/projects/{project_id}/databases/{database_id}/documents/{collection}
Host: firestore.googleapis.com
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "fields": {
    "timestamp": {
      "integerValue": "1234567890000"
    },
    "value": {
      "doubleValue": 27.5
    },
    "createdAt": {
      "timestampValue": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Firebase Firestore REST API Response Format:**
```json
{
  "name": "projects/{project_id}/databases/{database_id}/documents/{collection}/{document_id}",
  "fields": {
    "timestamp": {
      "integerValue": "1234567890000"
    },
    "value": {
      "doubleValue": 27.5
    }
  },
  "createTime": "2024-01-01T00:00:00Z",
  "updateTime": "2024-01-01T00:00:00Z"
}
```

#### **gRPC Protocol Buffer Format:**
```protobuf
message Document {
  string name = 1;
  map<string, Value> fields = 2;
  Timestamp create_time = 3;
  Timestamp update_time = 4;
}

message Value {
  oneof value_type {
    NullValue null_value = 11;
    bool boolean_value = 1;
    int64 integer_value = 2;
    double double_value = 3;
    string string_value = 4;
    Timestamp timestamp_value = 10;
    // ...
  }
}
```

### 3.4. Chứng minh việc sử dụng giao thức này trong dự án

#### **Chứng minh 1: Code sử dụng Firebase Firestore SDK**

**File `src/firebase.ts`:**
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAN6LREsqi28cuyyuSuVwoF6ZKuMnuVB7k",
  projectId: "sensor-superviser",
  // ...
};

appInstance = initializeApp(firebaseConfig);
dbInstance = getFirestore(appInstance);
```

**File `src/hooks/useTemperatureFeed.ts`:**
```typescript
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

const ref = collection(db, 'temperature');
const q = query(ref, orderBy('timestamp', 'desc'), limit(fetchLimit));
const unsub = onSnapshot(q, (snap) => {
  // Xử lý dữ liệu real-time
});
```

**ESP32 Code (ví dụ):**
```cpp
// ESP32 gửi dữ liệu cảm biến lên Firestore
FirebaseJson json;
json.set("timestamp", millis());
json.set("value", temperature);
Firebase.Firestore.createDocument(&fbdo, project_id, "", collection_path.c_str(), json.raw());
```

#### **Chứng minh 2: Network Traffic Analysis**

Có thể kiểm tra bằng Chrome DevTools:

1. Mở Chrome DevTools → Network tab
2. Filter: `firestore` hoặc `googleapis`
3. Xem các request:
   - **Type:** `fetch` (tất cả các request đều sử dụng Fetch API)
   - **Protocol:** `h2` (HTTP/2) hoặc `http/1.1`
   - **Method:** `POST`, `GET` (thông qua fetch API)
   - **URL:** 
     - `https://firestore.googleapis.com/v1/projects/...` (REST API)
     - `https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen` (real-time listener)
     - `channel?gsessionid=...&VER=8&database=projects%2Fsensor-superviser...` (long-polling channel)
   - **Initiator:** 
     - `firebase_firestore.js` (Firebase Firestore SDK)
     - `useTemperatureFeed.ts:73` (custom hook trong dự án)
   - **Request Headers:**
     ```
     :method: POST
     :authority: firestore.googleapis.com
     :scheme: https
     authorization: Bearer ...
     content-type: application/json
     ```
   - **Request Payload:**
     ```json
     {
       "fields": {
         "timestamp": {"integerValue": "..."},
         "value": {"doubleValue": 27.5}
       }
     }
     ```

**Bằng chứng từ Network Tra

