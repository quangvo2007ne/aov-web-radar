# HƯỚNG DẪN SỬ DỤNG WEB RADAR RELAY SERVER (LOCAL & CLOUD 24/7)

### 1. Giới thiệu
Đây là hệ thống máy chủ chuyển tiếp (Relay Server) độc lập viết bằng Node.js, thay thế hoàn toàn máy chủ gốc `antih4x.solstice.wtf`.
* **Tự động cấp mã phòng:** Khi người chơi bấm "Tạo mã & phát" trong game, server tự tạo mã phòng 6 ký tự.
* **Truyền toạ độ 60 FPS:** Nhận dữ liệu toạ độ thời gian thực từ iPhone và phát thẳng tới trình duyệt web (Safari, Chrome, v.v.).
* **Giao diện HTML5 Canvas:** Bản đồ địa hình, hiển thị vị trí tướng, thanh máu, 4 chiêu thức hồi chiêu, bùa/quái rừng, rồng/tà thần.

---

### 2. Hai phương thức vận hành

#### PHƯƠNG THỨC 1: DÙNG CLOUD HOSTING 24/7 TRÊN RENDER (KHUYÊN DÙNG)
> **Ưu điểm:** Máy chủ chạy vĩnh viễn trên đám mây, có link cố định, **tắt máy tính ở nhà thì radar vẫn hoạt động bình thường qua 4G**.

* **Địa chỉ xem Web Radar:**
  ```text
  https://aov-web-radar.onrender.com/hn-aov/webmap/
  ```
* **Link xem trực tiếp theo phòng:**
  ```text
  https://aov-web-radar.onrender.com/hn-aov/webmap/?room=<MÃ_PHÒNG>
  ```
* **Mã nguồn GitHub (Đã kết nối tự động):**
  `https://github.com/quangvo2007ne/aov-web-radar`
* **Vị trí Server:** Singapore (Southeast Asia) — Ping ~20-30ms về Việt Nam.

---

#### PHƯƠNG THỨC 2: CHẠY CỤC BỘ TRÊN MÁY TÍNH (OFFLINE / LAN)
> Dùng khi muốn tự host trên PC tại nhà mà không cần mạng Internet ngoài.

1. **Khởi động server:**
   * Mở thư mục `ChaptoRadar/web_radar_server/`
   * Nhấp đúp vào **`start_server.bat`** (cổng mặc định `8080`).
2. **Xem trong cùng mạng Wi-Fi:**
   * Truy cập: `http://172.168.0.208:8080/hn-aov/webmap/`
3. **Mở ra ngoài bằng Cloudflare Tunnel (tạm thời):**
   * Chạy lệnh: `npx untun tunnel 8080` (hoặc mở file `cloudflared.exe`).
   * Lấy link `https://xxx.trycloudflare.com/hn-aov/webmap/?room=<MÃ_PHÒNG>`.

---

### 3. Quy trình sử dụng trong trận đấu

1. **Cài đặt file IPA đã nạp sẵn cấu hình Cloud:**
   * File: `ChaptoRadar/build/perfect_20261014_224922/LienQuanChaptoRadar_Perfect.ipa`
2. **Mở game trên iPhone:**
   * Vào trận hoặc phòng chờ, mở Menu mod.
   * Chọn mục **Web Map** $\rightarrow$ Bấm nút **"Tạo mã & phát"**.
   * Game sẽ tự kết nối tới `wss://aov-web-radar.onrender.com` và hiển thị mã phòng (ví dụ: `AOV686`).
3. **Gửi link cho bạn bè:**
   * Gửi link: `https://aov-web-radar.onrender.com/hn-aov/webmap/?room=AOV686`
   * Bạn bè mở link bằng bất kỳ trình duyệt nào trên điện thoại/máy tính là xem được ngay lập tức ở tốc độ 60 FPS mà không cần cài thêm bất kỳ app nào.

---

### 4. Công cụ hỗ trợ build nhanh

Nếu sau này bạn đổi tên miền server hoặc đổi host khác, chỉ cần chạy một lệnh duy nhất:
```bash
python set_radar_url.py <URL_SERVER_MỚI>
```
Script sẽ tự động cập nhật toàn bộ bundle JavaScript và đóng gói ra file IPA hoàn hảo mới trong 20 giây.
