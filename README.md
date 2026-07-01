# TNTT Management — Hệ Thống Quản Lý Học Viên & Điểm Danh

<p align="center">
  <strong>Một hệ thống quản lý học sinh, điểm số & điểm danh thông minh dành cho các lớp học giáo lý / đoàn thể, với chi phí vận hành gần như bằng 0.</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-purple?logo=vite" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-cyan?logo=tailwindcss" />
  <img alt="GAS Backend" src="https://img.shields.io/badge/Backend-Google_Apps_Script-yellow?logo=google" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## ✨ Tính năng nổi bật

| Tính năng | Mô tả |
|-----------|-------|
| **📊 Dashboard thông minh** | Biểu đồ tròn, cột xếp chồng, bảng xếp hạng lớp, KPI real-time |
| **📝 Quản lý học viên** | Thêm/sửa/xoá, tìm kiếm, hồ sơ chi tiết, phân lớp tự động |
| **📚 Sổ điểm** | Nhập điểm GK1, HK1, GK2, HK2 — tự động tính ĐTB & xếp loại (Xuất sắc, Giỏi, Khá, TB, Yếu) |
| **📷 Điểm danh QR** | Quét mã QR qua camera, chống trùng, chế độ nhập thủ công, lịch sử real-time |
| **🖨️ In thẻ đeo** | Tạo thẻ học viên với QR code, xuất PDF |
| **📈 Báo cáo điểm danh** | Xem theo ngày/tuần/tháng/tuỳ chỉnh, biểu đồ xu hướng, xuất Excel |
| **📎 Xuất Excel** | Danh sách học sinh, bảng điểm, thống kê điểm danh — lưu lên Google Drive |
| **👥 Phân quyền** | 3 vai trò: Admin / Teacher / Guest — phân lớp cho giáo viên |
| **📆 Đa năm học** | Chuyển đổi database theo năm học, quản lý ngay trên giao diện |
| **🔔 Thông báo** | Yêu cầu cấp quyền, góp ý, thông báo admin — gửi mail tự động |
| **🔐 Đăng nhập Google** | Xác thực OAuth 2.0 an toàn, một chạm đăng nhập |

---

## 🧱 Công nghệ

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Vite 6 |
| **Giao diện** | Tailwind CSS 4 (CDN) + Lucide React icons |
| **Biểu đồ** | Recharts |
| **QR** | html5-qrcode, qrcode.react |
| **PDF** | jspdf + html2canvas |
| **Thông báo** | react-hot-toast |
| **Backend** | Google Apps Script |
| **Database** | Google Sheets (Students, Grades, Users, Notifications, Attendance) |
| **Auth** | Google Sign-In (OAuth 2.0) |

---

## 🚀 Cài đặt nhanh

### Yêu cầu
- Node.js 18+
- Tài khoản Google (cho backend & auth)
- Một file Google Sheets làm database

### Frontend

```bash
git clone https://github.com/dongthinhlong/TNTT-MANAGEMENT.git
cd TNTT-MANAGEMENT
npm install
npm run dev
```

Mở trình duyệt tại **http://localhost:3000**.

### Build production

```bash
npm run build
```

Thư mục `dist/` sẽ được tạo ra, bạn có thể deploy lên Vercel, Netlify, GitHub Pages, Cloudflare Pages, v.v.

---

## ⚙️ Cấu hình Backend (Google Apps Script)

Dự án dùng **Google Sheets làm database** và **Google Apps Script làm API**. Chi phí vận hành = 0.

### 1. Tạo Google Sheet

Tạo một file Google Sheets mới, tạo các sheet (tab) sau:

```
Students | Grades | Users | Notifications | Attendance
```

Mỗi sheet có header dòng đầu. Hệ thống sẽ tự động tạo header nếu chưa có.

### 2. Triển khai Apps Script

1. Vào **Extensions → Apps Script** trong Google Sheet của bạn
2. Copy toàn bộ nội dung file `gas/backend.js` vào editor
3. Sửa dòng `ADMIN_EMAIL` thành email của bạn (người quản trị)
4. **Deploy → New Deployment** → chọn **Web App**

| Cấu hình | Giá trị |
|----------|---------|
| **Execute as** | Me |
| **Who has access** | Anyone |

5. Copy URL Web App (dạng `https://script.google.com/macros/s/...`)

### 3. Kết nối Frontend với Backend

Tạo file `.env` trong thư mục dự án:

```env
VITE_GAS_API_URL=https://script.google.com/macros/s/.../exec
```

### 4. Cấu hình Google OAuth

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới → **APIs & Services → Credentials**
3. Tạo **OAuth 2.0 Client ID** (Web Application)
4. Thêm `http://localhost:3000` và domain của bạn vào "Authorized JavaScript origins"
5. Copy Client ID → dán vào hằng số `GOOGLE_CLIENT_ID` trong file `constants.ts`

---

## 📦 Cấu trúc thư mục

```
TNTT-MANAGEMENT/
├── App.tsx                    # Root component (routing, auth)
├── index.tsx                  # Entry point
├── index.html                 # HTML shell (Tailwind CDN, Google Sign-In)
├── constants.ts               # Hằng số, màu sắc, GOOGLE_CLIENT_ID
├── types.ts                   # Định nghĩa TypeScript types
├── package.json
├── vite.config.ts
├── tsconfig.json
│
├── components/                # UI Components (22 files)
│   ├── Hub.tsx                # Dashboard chính
│   ├── Layout.tsx             # Header, navigation, dropdown
│   ├── Login.tsx              # Google Sign-In
│   ├── StudentList.tsx        # Danh sách học viên
│   ├── StudentProfile.tsx     # Hồ sơ học viên + QR
│   ├── GradeInput.tsx         # Nhập điểm
│   ├── Dashboard.tsx          # Thống kê, biểu đồ
│   ├── AttendanceScanner.tsx  # Quét QR điểm danh
│   ├── AttendanceReport.tsx   # Báo cáo điểm danh
│   ├── BadgePrinter.tsx       # In thẻ
│   ├── Export.tsx             # Xuất Excel
│   ├── UserManagement.tsx     # Quản lý người dùng
│   ├── AcademicYearManager.tsx# Quản lý năm học
│   ├── AdminNotifications.tsx # Thông báo admin
│   └── ... (các component khác)
│
├── services/
│   └── gasApi.ts              # API client — kết nối với GAS backend
│
└── gas/
    └── backend.js             # Google Apps Script backend (toàn bộ logic)
```

---

## 📸 Ảnh chụp màn hình

| Trang chủ | Dashboard | Điểm danh |
|-----------|-----------|-----------|
| Landing page với login | Biểu đồ, KPI, bảng xếp hạng | Quét QR qua camera |
| Sổ điểm | Hồ sơ học viên | Quản lý người dùng |
| Bảng điểm chi tiết, xếp loại | Thông tin + QR code | Phân quyền Admin/Teacher |

> *(Bạn có thể thêm ảnh chụp màn hình thực tế vào đây)*

---

## 🔒 Bảo mật & Quyền riêng tư

- **Không lưu mật khẩu** — xác thực qua Google OAuth 2.0
- **Phân quyền chặt chẽ** — Admin / Teacher / Guest, chỉ xem được dữ liệu được phân công
- **Quota GAS miễn phí** — Backend dùng Google Apps Script, không cần server riêng
- **Dữ liệu trên Google Drive** — thuộc quyền sở hữu của bạn
- **Mã nguồn mở** — bạn có thể kiểm tra, fork, tuỳ chỉnh

---

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:

1. Fork repo
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit thay đổi: `git commit -m 'Thêm tính năng X'`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

Báo lỗi hoặc đề xuất tính năng qua [Issues](https://github.com/dongthinhlong/TNTT-MANAGEMENT/issues).

---

## 📄 Giấy phép

Dự án được phân phối dưới giấy phép **MIT**. Xem file `LICENSE` để biết thêm chi tiết.

---

<p align="center">
  <strong>TNTT Management</strong> — Xây dựng với ❤️ để phục vụ cộng đồng.
</p>
