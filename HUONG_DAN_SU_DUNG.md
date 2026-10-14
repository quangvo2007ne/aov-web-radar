# HƯỚNG DẪN SỬ DỤNG WEB RADAR RELAY SERVER

### 1. Giới thiệu
Đây là máy chủ chuyển tiếp (Relay Server) độc lập viết bằng Node.js, thay thế hoàn toàn máy chủ gốc `antih4x.solstice.wtf`.
* Tự động tạo mã phòng xem Web Map khi người chơi bấm nút trong game.
* Nhận dữ liệu toạ độ thời gian thực (60 FPS) từ iPhone và phát thẳng tới trình duyệt web của bạn bè.
* Tích hợp sẵn trọn bộ giao diện xem Web Map chính hãng (Canvas HTML5, bản đồ địa hình, icon tướng, thanh máu, hồi chiêu).

---

### 2. Cách khởi động Server

#### Bước 1: Khởi động Server trên máy tính
* Mở thư mục `ChaptoRadar/web_radar_server/`
* Nhấp đúp vào tệp **`start_server.bat`** (hoặc mở terminal gõ `node server.js`).
* Server sẽ lắng nghe tại cổng `8080`.
* Địa chỉ truy cập nội bộ (LAN): `http://172.168.0.208:8080/hn-aov/webmap/`

---

### 3. Cách cho bạn bè ở xa cùng xem (Miễn phí 100%)

Để bạn bè không ngồi chung mạng Wi-Fi (dùng 4G hoặc ở nhà riêng) có thể xem được:
Mở một cửa sổ Terminal/Command Prompt thứ hai và gõ một trong hai lệnh sau:

* **Cách A (Dùng localtunnel - không cần cài đặt thêm):**
  ```bash
  npx localtunnel --port 8080
  ```
  Nó sẽ in ra một đường link public, ví dụ: `https://cool-panda-42.loca.lt`

* **Cách B (Dùng Cloudflare Tunnel chính hãng):**
  Tải `cloudflared.exe` từ Cloudflare về và gõ:
  ```bash
  cloudflared tunnel --url http://localhost:8080
  ```
  Nó sẽ in ra link dạng: `https://xxx.trycloudflare.com`

---

### 4. Quy trình trong trận đấu

1. Bật Server trên PC (`start_server.bat`).
2. Mở game Liên Quân trên iPhone.
3. Mở Menu Solstice $\rightarrow$ Chọn mục **Web Map** $\rightarrow$ Bấm nút **"Tạo mã & phát"**.
4. Game sẽ lập tức kết nối tới server và cấp một mã phòng 6 ký tự (ví dụ: `AOV888`).
5. Bạn gửi đường link cho bạn bè (hoặc bạn bè mở link web nhập mã phòng `AOV888`).
6. Khi bạn vào trận đấu, toàn bộ tướng, quái, rồng/tà thần, máu và hồi chiêu sẽ hiển thị trực tiếp trên trình duyệt của bạn bè với tốc độ 60 FPS!
