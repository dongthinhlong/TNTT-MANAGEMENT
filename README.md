# TNTT Kim Thành - Hệ Thống Quản Lý Học Viên

Chào mừng bạn đến với dự án **TNTT Kim Thành Management**. Đây là hệ thống quản lý học sinh, điểm số và điểm danh chuyên nghiệp được tối ưu hóa cho các đơn vị giáo dục hoặc đoàn thể (Thiếu Nhi Thánh Thể).

## 🚀 Giới thiệu
Hệ thống giúp tự động hóa quy trình quản lý từ việc hồ sơ học viên, nhập điểm, thống kê kết quả học tập cho đến việc điểm danh thông minh qua mã QR.

### Các tính năng chính:
- **Bảng điều khiển (Hub):** Giao diện hiện đại, tập trung các chức năng chính.
- **Quản lý Học viên:** Danh sách, tìm kiếm và hồ sơ chi tiết.
- **Học tập & Kết quả:** Nhập điểm, tính toán trung bình và báo cáo thống kê.
- **Điểm danh thông minh:** Quét mã QR qua camera, in thẻ đeo học viên tự động.
- **Quản trị hệ thống:** Quản lý người dùng (Admin/Teacher/Guest) và cấu hình năm học đa nhiệm.

---

## 🛠 Công nghệ sử dụng
- **Frontend:** React 19 + Vite + TypeScript.
- **Styling:** Tailwind CSS (via CDN) + Lucide Icons.
- **Backend:** Google Apps Script (GAS) - sử dụng Google Sheets làm cơ sở dữ liệu.
- **Tích hợp:** Google Sign-In, QR Scanner (html5-qrcode).

---

## 💻 Hướng dẫn cài đặt (Dành cho người mới)

### 1. Yêu cầu hệ thống
Bạn cần cài đặt sẵn:
- **Node.js** (Phiên bản 18 trở lên).
- **Trình duyệt hiện đại** (Chrome, Edge, Safari).
- Một tài khoản Google (để cấu hình Backend).

### 2. Các bước cài đặt
1. **Tải mã nguồn về máy:**
   ```bash
   git clone https://github.com/dongthinhlong/TNTT-KIM-THANH-MANAGEMENT.git
   cd TNTT-KIM-THANH-MANAGEMENT
   ```

2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

3. **Chạy môi trường phát triển (Local):**
   ```bash
   npm run dev
   ```
   Sau đó truy cập địa chỉ: `http://localhost:5173` (hoặc cổng hiển thị trong terminal).

---

## ⚙️ Cấu hình Backend (Quan trọng)

Dự án này sử dụng Google Apps Script làm Backend. Để hệ thống hoạt động, bạn cần cấu hình link API:

1. Mở file `services/gasApi.ts`.
2. Tìm biến `GAS_API_URL`.
3. Thay thế bằng URL Web App mà bạn đã triển khai từ Google Apps Script.

**Lưu ý:** Mã nguồn backend nằm trong thư mục `/gas/backend_multi_year.js`. Bạn có thể copy code này dán vào dự án App Script của mình.

---

## 🔧 Hướng dẫn thiết lập chi tiết (Thông số kỹ thuật)

Để repo này hoạt động hoàn chỉnh dưới danh nghĩa của bạn, bạn **BẮT BUỘC** phải thay đổi các thông số sau:

### 1. Cấu hình Đăng nhập (Google Cloud)
Bạn cần tạo Client ID riêng để chức năng đăng nhập Google hoạt động trên tên miền của bạn:
- Truy cập [Google Cloud Console](https://console.cloud.google.com/).
- Tạo một Project mới.
- Vào mục **APIs & Services > Credentials**.
- Tạo **OAuth 2.0 Client ID** loại "Web Application".
- Thêm `http://localhost:5173` (cho máy local) và domain của bạn (nếu có) vào mục "Authorized JavaScript origins".
- Copy Client ID nhận được và dán vào file `constants.ts` tại biến `GOOGLE_CLIENT_ID`.

### 2. Cấu hình Quyền Quản trị (GAS Backend)
Đây là phần trả lời cho câu hỏi về "cài đặt tài khoản":
- Mở file `gas/backend_multi_year.js`.
- Tại dòng 33, thay đổi `ADMIN_EMAIL = 'dongthinhlong@gmail.com'` thành **Email của bạn**. Chỉ email này mới có quyền vào mục "Hệ thống" và "Cấu hình năm học".

### 3. Cấu hình Cơ sở dữ liệu (Google Sheets)
- Tạo một file Google Sheets mới trên Drive của bạn.
- Đảm bảo file có các Sheet (Tab) tên: `Students`, `Grades`, `Users`, `Notifications`, `Attendance`.
- Lấy ID của file Google Sheet (nằm trên thanh địa chỉ URL).
- Trong file `gas/backend_multi_year.js`, tại hàm `getDatabaseMap()`, hãy thay ID mặc định bằng ID file Sheet bạn vừa tạo.

### 4. Triển khai Web App
- Trong trình soạn thảo Google Apps Script, nhấn **Deploy > New Deployment**.
- Chọn loại **Web App**.
- **Execute as:** Me (Email của bạn).
- **Who has access:** Anyone (Quan trọng để frontend có thể gọi API).
- Sau khi deploy, copy URL nhận được và dán vào `services/gasApi.ts`.

---

## 📂 Cấu trúc thư mục
- `/components`: Chứa các thành phần giao diện (UI) như Hub, Layout, StudentList...
- `/services`: Chứa logic gọi API (gasApi.ts) và xử lý dữ liệu.
- `/gas`: Chứa mã nguồn Google Apps Script cho Backend.
- `/types.ts`: Định nghĩa các kiểu dữ liệu TypeScript.
- `index.html`: File HTML chính (nơi nạp Tailwind CDN và Font).

---

## 📦 Xây dựng bản Production
Để đóng gói ứng dụng để đưa lên hosting (Vercel, Netlify, GitHub Pages):
```bash
npm run build
```
Thư mục `dist/` sẽ được tạo ra, bạn chỉ cần upload toàn bộ file trong thư mục này lên server.

---

## 🤝 Đóng góp
Mọi ý đóng góp hoặc báo lỗi vui lòng tạo **Issue** hoặc gửi **Pull Request**. Cảm ơn bạn đã quan tâm đến dự án!

---
**TNTT Kim Thành Team** - *Sáng tạo để phục vụ.*
