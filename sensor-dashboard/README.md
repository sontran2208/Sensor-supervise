# Sensor Dashboard

Ứng dụng web/mobile để giám sát dữ liệu cảm biến theo thời gian thực, trực quan hóa bằng biểu đồ, theo dõi GPS, phát hiện bất thường bằng Edge AI và điều khiển relay từ dashboard.

## Tính năng chính

- Theo dõi các cảm biến: nhiệt độ, độ ẩm, ánh sáng, khoảng cách, GPS và khí gas MQ-2.
- Xem dữ liệu theo thời gian thực bằng biểu đồ và bảng dữ liệu.
- Lọc dữ liệu theo mốc thời gian nhanh hoặc khoảng ngày tùy chọn.
- Hiển thị bản đồ GPS từ dữ liệu vị trí thu thập được.
- Theo dõi trạng thái hệ thống Edge AI, cảnh báo và chỉ số hoạt động.
- Thu thập baseline, nạp baseline từ file và train lại mô hình AI ngay trên giao diện.
- Điều khiển relay thủ công qua Firebase Realtime Database.
- Hỗ trợ build web app và đóng gói Android bằng Capacitor.

## Yêu cầu môi trường

- Node.js 18 trở lên
- npm
- Kết nối Firebase hợp lệ

## Cài đặt và chạy

Từ thư mục `sensor-dashboard`:

```bash
npm install
npm run dev
```

Sau khi chạy, mở địa chỉ Vite local được in ra trong terminal, thường là `http://localhost:5173`.

### Build production

```bash
npm run build
```

### Chạy bản preview sau khi build

```bash
npm run preview
```

## Cấu hình dữ liệu

App hiện đọc dữ liệu trực tiếp từ Firebase:

- Firestore:
  - `temperature`
  - `humidity`
  - `light`
  - `distance`
  - `mq2_raw`
  - `lat`
  - `lng`
  - `mode`
- Realtime Database:
  - `/relayControl`

Trong code hiện tại, cấu hình Firebase nằm tại `src/firebase.ts`.

### Định dạng dữ liệu mong đợi

- `temperature`, `humidity`, `light`, `distance`: mỗi document nên có `value` và `timestamp`
- `mq2_raw`: mỗi document nên có `mq2_raw` hoặc `value`, kèm `timestamp`
- GPS:
  - collection `lat`: field `value` là vĩ độ
  - collection `lng`: field `value` là kinh độ
  - collection `mode`: field `value` là `REAL` hoặc `SIMULATED`
  - các bản ghi GPS được ghép với nhau theo `timestamp`

## Hướng dẫn sử dụng app

### 1. Màn hình Dashboard

Khi mở app, bạn sẽ vào trang `Dashboard`. Tại đây có các khu vực chính:

- `Sensor Tabs`: chuyển nhanh giữa các nhóm dữ liệu cảm biến
- `Time Range Stats`: chọn khoảng thời gian xem dữ liệu hoặc lọc theo ngày bắt đầu/kết thúc
- `Relay Control`: bật/tắt relay thủ công
- `AI Activity Monitor`: theo dõi tình trạng hoạt động của Edge AI
- `Biểu đồ dữ liệu`: xem xu hướng dữ liệu theo thời gian
- `Bảng dữ liệu`: xem danh sách mẫu đo gần nhất

### 2. Chuyển cảm biến cần theo dõi

Trên đầu trang có các tab:

- `Nhiệt độ`
- `Ánh sáng`
- `Khoảng cách`
- `GPS`
- `Khí gas`

Chọn tab tương ứng để cập nhật biểu đồ, thống kê và bảng dữ liệu.

Lưu ý: độ ẩm hiện được nạp cùng hệ thống và ghép vào dữ liệu nhiệt độ để phục vụ hiển thị/phân tích.

### 3. Lọc dữ liệu theo thời gian

Tại khối `Time Range Stats`, bạn có thể:

- Chọn các mốc thời gian nhanh như vài phút hoặc vài chục phút gần nhất
- Chọn khoảng ngày bắt đầu và kết thúc để xem dữ liệu tùy biến
- Xóa bộ lọc ngày để quay lại chế độ xem thời gian gần nhất

### 4. Xem GPS

Khi chọn tab `GPS`, app hiển thị thêm bản đồ để theo dõi vị trí. Dữ liệu có `mode = REAL` sẽ được ưu tiên đưa vào luồng AI; dữ liệu `SIMULATED` chủ yếu dùng để hiển thị hoặc kiểm thử.

### 5. Xem dữ liệu khí gas

Khi chọn tab `Khí gas`, app hiển thị dashboard riêng cho MQ-2. Giá trị `mq2_raw` từ ESP32 sẽ được quy đổi nội bộ thành thang tổng hợp để Edge AI dễ phân tích bất thường hơn.

### 6. Điều khiển relay

Khối `Relay Control` cho phép:

- Bật relay bằng nút `Bật (ON)`
- Tắt relay bằng nút `Tắt (OFF)`
- Theo dõi trạng thái relay hiện tại đang lưu tại `/relayControl`

Nếu tính năng tự động relay theo AI/nhiệt độ đang bật, trạng thái relay có thể bị hệ thống ghi đè định kỳ.

## Trang AI

Nhấn nút `AI` trên header để chuyển sang trang Edge AI. Trang này gồm 2 phần chính:

### Baseline Data Collector

Cho phép chuẩn bị dữ liệu nền để train mô hình:

1. `Collect Baseline`: lấy dữ liệu hiện có trong khoảng gần nhất và xuất file JSON
2. `Load từ File`: nạp baseline đã lưu trước đó
3. `Load từ IndexedDB`: nạp baseline đã lưu cục bộ trong trình duyệt
4. `Train Model từ Baseline`: huấn luyện lại mô hình phát hiện bất thường

### Edge AI Dashboard

Hiển thị tình trạng hoạt động của hệ thống AI, số cảnh báo, trạng thái health và các chỉ số phát hiện bất thường.

## Android

Project đã có cấu hình Capacitor Android. Quy trình cơ bản:

```bash
npm run build
npx cap sync android
npx cap open android
```

Thư mục cấu hình chính:

- `android/`
- `capacitor.config.ts`

## Một số lưu ý khi sử dụng

- Nếu dashboard không hiện dữ liệu, hãy kiểm tra lại Firebase project và dữ liệu trong các collection Firestore.
- Nếu relay không đổi trạng thái, hãy kiểm tra kết nối Realtime Database và thiết bị ESP32 đang đọc `/relayControl`.
- Nếu AI không đưa ra cảnh báo, hãy thử thu thập baseline và train lại model từ trang `AI`.
- Dữ liệu GPS được ghép từ nhiều collection khác nhau theo `timestamp`, vì vậy sai lệch timestamp lớn có thể làm mất điểm dữ liệu trên bản đồ.

## Công nghệ sử dụng

- React 19
- TypeScript
- Vite
- Firebase Firestore
- Firebase Realtime Database
- TensorFlow.js
- Capacitor Android

## Cấu trúc thư mục quan trọng

- `src/App.tsx`: giao diện và luồng chính của dashboard
- `src/components/`: các thành phần UI
- `src/hooks/`: hooks đọc dữ liệu Firebase
- `src/ai/`: logic Edge AI và phát hiện bất thường
- `src/firebase.ts`: khởi tạo Firebase
- `src/utils/`: các tiện ích điều khiển relay, servo và baseline
