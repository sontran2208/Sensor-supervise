# 📊 Hướng Dẫn Train Baseline và Test Anomaly Detection

## ⚠️ TẠI SAO CẦN TRAIN BASELINE?

**CÓ, bạn NÊN train baseline trước khi test để đạt độ chính xác tốt nhất!**

### Vấn đề khi KHÔNG train baseline:
- ❌ Model train với **synthetic data** → không phù hợp với dữ liệu thực tế
- ❌ **Running stats** (mean, std) ban đầu = 0 → z-score không chính xác trong giai đoạn đầu
- ❌ **Threshold** ban đầu không chính xác → có thể bỏ sót anomaly hoặc false positive
- ❌ **Sensor history** rỗng → trend analysis không hoạt động tốt trong giai đoạn đầu
- ❌ **Drift detection** kém hiệu quả vì không có baseline để so sánh

### Lợi ích khi CÓ baseline:
- ✅ Model train từ **dữ liệu thực tế** → phù hợp với hệ thống của bạn
- ✅ **Running stats** được calibrate ngay → normalization chính xác
- ✅ **Threshold** được warm-up → ít false positive/negative
- ✅ **Sensor history** đầy đủ → trend analysis hoạt động tốt ngay
- ✅ **Drift detection** chính xác hơn với trend analysis

---

## 📋 QUY TRÌNH TRAIN BASELINE

### Bước 1: Thu thập Baseline Data (Collect Baseline)

**Cách 1: Collect từ dữ liệu hiện tại (60 phút gần nhất)**
1. Vào trang **AI** → phần **"Collect Baseline"**
2. Click nút **"📊 Collect Baseline (60 phút gần nhất)"**
3. Đợi hệ thống thu thập dữ liệu từ tất cả sensors
4. Dữ liệu sẽ được lưu vào IndexedDB

**Cách 2: Load từ File JSON**
1. Chuẩn bị file JSON chứa baseline data (format: `{ readings: SensorReading[] }`)
2. Click **"📁 Load từ File"**
3. Chọn file JSON
4. Dữ liệu sẽ được load và lưu vào IndexedDB

**Cách 3: Load từ IndexedDB (nếu đã có)**
1. Click **"🔄 Load từ IndexedDB"**
2. Dữ liệu đã lưu trước đó sẽ được load

**⚠️ Lưu ý:**
- Baseline data nên là **dữ liệu bình thường** (không có anomaly)
- Nên collect trong điều kiện **hoạt động bình thường** của hệ thống
- Tối thiểu cần **100-200 readings** để train hiệu quả
- Càng nhiều dữ liệu càng tốt (khuyến nghị: 500+ readings)

---

### Bước 2: Train Model từ Baseline

1. Sau khi đã collect/load baseline data
2. Click nút **"🚀 Train Model từ Baseline"**
3. Đợi quá trình training hoàn tất (có thể mất 1-2 phút)
4. Bạn sẽ thấy thông báo **"✅ Model đã được train từ baseline!"**

**Quá trình training:**
- Model sẽ train với **50 epochs** từ baseline data
- Tự động calibrate **running stats** (mean, std) cho mỗi sensor
- Warm-up **reconstruction error history** để tính threshold chính xác
- Khởi tạo **sensor history** cho trend analysis

---

### Bước 3: Test Anomaly Detection

Sau khi train xong, bạn có thể test với:

**Cách 1: Test với Fake Simulator**
1. Scroll xuống phần **"Fake ESP Simulator"**
2. Chọn loại anomaly muốn test:
   - **Spike**: Giá trị đột ngột tăng cao
   - **Drift**: Giá trị tăng dần theo thời gian
   - **Outlier**: Giá trị bất thường
   - **Pattern Break**: Thay đổi pattern đột ngột
3. Bật simulator và quan sát alerts

**Cách 2: Test với dữ liệu thực tế**
- Hệ thống sẽ tự động phát hiện anomaly từ dữ liệu real-time
- Xem alerts ở phần **"🚨 Alerts"** trong Edge AI System
- Xem logs ở phần **"📝 Logs"**

---

## 🎯 KHUYẾN NGHỊ

### 1. Baseline Data Quality
- ✅ Collect trong điều kiện **hoạt động bình thường**
- ✅ Đảm bảo có đủ dữ liệu từ **tất cả sensors**
- ✅ Thời gian collect: **ít nhất 30-60 phút** hoạt động bình thường
- ❌ KHÔNG collect khi có anomaly đang xảy ra

### 2. Retrain Baseline
Nên retrain baseline khi:
- Hệ thống có thay đổi lớn (hardware, môi trường)
- Phát hiện nhiều false positive/negative
- Sau khi cập nhật model hoặc thuật toán

### 3. Monitoring
Sau khi train, theo dõi:
- **Reconstruction Error**: Nên ổn định và thấp
- **Threshold**: Tự động điều chỉnh theo dữ liệu
- **Alerts**: Kiểm tra xem có false positive không
- **Logs**: Xem chi tiết phát hiện anomaly

---

## 🔍 KIỂM TRA BASELINE ĐÃ TRAIN

Sau khi train, bạn có thể kiểm tra:

1. **Xem Status**:
   - Vào trang AI → phần **"📊 Status"**
   - Kiểm tra **"Model Status"** = "Trained"
   - **"Baseline Loaded"** = true

2. **Xem Logs**:
   - Vào phần **"📝 Logs"**
   - Tìm log: **"Model trained from baseline data"**
   - Kiểm tra **"Running stats"** đã được calibrate

3. **Test với Fake Simulator**:
   - Bật **Drift** anomaly
   - Kiểm tra xem có alert được trigger không
   - So sánh với trước khi train (nên chính xác hơn)

---

## ❓ FAQ

**Q: Có thể bỏ qua bước train baseline không?**
A: Có, hệ thống vẫn hoạt động nhưng độ chính xác sẽ thấp hơn, đặc biệt là drift detection.

**Q: Cần bao nhiêu dữ liệu để train?**
A: Tối thiểu 100-200 readings, khuyến nghị 500+ readings từ tất cả sensors.

**Q: Có thể train lại không?**
A: Có, bạn có thể collect baseline mới và train lại bất cứ lúc nào.

**Q: Baseline có tự động load không?**
A: Có, hệ thống sẽ tự động load baseline từ IndexedDB khi khởi động (nếu có).

**Q: Làm sao biết baseline đã train thành công?**
A: Kiểm tra logs hoặc test với fake simulator - nếu drift detection hoạt động tốt thì đã train thành công.

---

## 📝 TÓM TẮT QUY TRÌNH

```
1. Collect Baseline (60 phút dữ liệu bình thường)
   ↓
2. Train Model từ Baseline
   ↓
3. Test với Fake Simulator hoặc dữ liệu thực tế
   ↓
4. Monitor và điều chỉnh nếu cần
```

**🎯 Kết luận: Nên train baseline trước để đạt độ chính xác tốt nhất, đặc biệt là với trend analysis và drift detection mới!**

