# Hướng dẫn Deploy Frontend lên GitHub Pages

## 💰 HOÀN TOÀN MIỄN PHÍ!

Tất cả các dịch vụ dưới đây đều **MIỄN PHÍ 100%** cho dự án cá nhân:
- ✅ **GitHub Pages**: Miễn phí không giới hạn cho public repositories
- ✅ **Vercel**: Miễn phí với bandwidth và build time hào phóng
- ✅ **Netlify**: Miễn phí với 100GB bandwidth/tháng

**Không cần thẻ tín dụng, không cần trả tiền!**

---

## Bước 1: Enable GitHub Pages trong Repository Settings

1. Vào repository trên GitHub: `https://github.com/sontran2208/Sensor-supervise`
2. Click vào **Settings** (ở thanh menu trên cùng)
3. Scroll xuống phần **Pages** (ở sidebar bên trái)
4. Trong phần **Source**, chọn:
   - **Source**: `GitHub Actions`
5. Lưu lại

## Bước 2: Push code lên GitHub

Workflow đã được tạo tự động, chỉ cần push code lên:

```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

## Bước 3: Kiểm tra Deployment

1. Vào tab **Actions** trên GitHub repository
2. Bạn sẽ thấy workflow "Deploy to GitHub Pages" đang chạy
3. Đợi workflow hoàn thành (thường mất 2-3 phút)
4. Sau khi hoàn thành, link website sẽ là:
   ```
   https://sontran2208.github.io/Sensor-supervise/
   ```

## Lưu ý

- Website sẽ tự động deploy mỗi khi bạn push code lên nhánh `main`
- Nếu có lỗi trong quá trình build, kiểm tra tab **Actions** để xem chi tiết
- Link website sẽ được hiển thị trong phần **Environments** của repository

## Các giải pháp thay thế khác

Nếu GitHub Pages không phù hợp, bạn có thể dùng:

1. **Vercel** (miễn phí, nhanh):
   - Vào https://vercel.com
   - Import repository từ GitHub
   - Set root directory: `sensor-dashboard`
   - Deploy tự động

2. **Netlify** (miễn phí):
   - Vào https://netlify.com
   - Import repository từ GitHub
   - Build command: `cd sensor-dashboard && npm run build`
   - Publish directory: `sensor-dashboard/dist`

