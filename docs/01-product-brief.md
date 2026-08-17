# Product Brief — Ngôi Sao Lớp Học

## 1. Bối cảnh

Concept gốc mô tả một ứng dụng quản lý lớp học cho giáo viên tiểu học với thông điệp **“Mỗi hành động tốt – Một ngôi sao sáng!”**. Hệ thống kết hợp quản lý lớp, ghi nhận hành vi, gamification, tuyên dương, nhiệm vụ, phần thưởng, thống kê tiến bộ và phụ huynh theo dõi.

## 2. Vấn đề cần giải quyết

Giáo viên thường phải ghi chép rời rạc việc phát biểu, làm bài, đi học đúng giờ, trực nhật, vi phạm nội quy, nhiệm vụ và tuyên dương. Việc tổng hợp cuối tuần/tháng mất thời gian và thiếu trực quan. Phụ huynh cũng khó theo dõi tiến bộ hằng ngày ngoài điểm số học tập.

## 3. Tầm nhìn sản phẩm

Một web/PWA cực nhanh để giáo viên có thể thao tác ngay trong lớp học: chọn học sinh → chọn hành vi → cộng/trừ điểm → hệ thống tự cập nhật cấp độ, huy hiệu, nhiệm vụ, bảng tiến bộ và nội dung phụ huynh nhìn thấy.

Sản phẩm nên tạo động lực tích cực, không biến lớp học thành cuộc đua điểm số.

## 4. Người dùng chính

### Giáo viên
- Tạo và quản lý lớp.
- Quản lý học sinh.
- Cộng/trừ điểm nhanh.
- Giao nhiệm vụ, huy hiệu, phần thưởng.
- Đăng tuyên dương.
- Xem thống kê.

### Phụ huynh
- Chỉ xem dữ liệu của con.
- Theo dõi hoạt động, tiến bộ, nhiệm vụ và lời nhắn giáo viên.

### Học sinh
- Xem hồ sơ, điểm, cấp độ, huy hiệu, nhiệm vụ và phần thưởng.
- Không được tự sửa dữ liệu.

### Quản trị viên
- Quản lý trường/lớp/tài khoản.
- Thiết lập mẫu hành vi, chính sách dữ liệu, cấu hình hệ thống.

## 5. Mục tiêu sản phẩm

1. Giảm thời gian quản lý lớp và ghi nhận hành vi.
2. Tăng tần suất giáo viên khen thưởng các hành vi tích cực.
3. Cung cấp lịch sử minh bạch thay vì ghi chép cảm tính.
4. Giúp học sinh thấy tiến bộ bằng hình ảnh, cấp độ và huy hiệu.
5. Tạo kênh phụ huynh theo dõi nhẹ nhàng, không quá tải thông báo.
6. Lưu giữ khoảnh khắc đẹp của lớp học.

## 6. Nguyên tắc cốt lõi

- Positive-first: hành vi tích cực là trung tâm.
- Quick action: thao tác cộng/trừ điểm tối đa 2–3 bước.
- Explainable: mỗi thay đổi điểm đều có lý do và người thực hiện.
- Reversible: sửa sai bằng giao dịch điều chỉnh, không xóa lịch sử.
- Privacy by design: phụ huynh chỉ thấy con mình; dữ liệu lớp không công khai.
- Age-appropriate: hình ảnh vui tươi nhưng không gây áp lực cạnh tranh.

## 7. Các khối chức năng từ ảnh tham chiếu

1. Mục tiêu lớp học.
2. Ý tưởng cốt lõi: cộng/trừ điểm, nhân vật phát triển, huy hiệu, tuyên dương.
3. Nhân vật lớn lên theo điểm qua 5 giai đoạn.
4. Trang chủ giáo viên.
5. Danh mục hành vi cộng điểm.
6. Danh mục hành vi trừ điểm.
7. Chức vụ trong lớp.
8. Huy hiệu.
9. Kho quà.
10. Góc tuyên dương.
11. Nhiệm vụ hôm nay.
12. Thống kê tiến bộ.
13. Phụ huynh theo dõi.
14. Lợi ích/giá trị hệ thống.

## 8. Phạm vi MVP

- Authentication và phân quyền.
- Lớp học + học sinh.
- Điểm thưởng/phạt + lịch sử giao dịch.
- Bộ hành vi cấu hình được.
- Cấp độ nhân vật.
- Huy hiệu.
- Nhiệm vụ.
- Kho quà và đổi quà thủ công.
- Góc tuyên dương.
- Dashboard và biểu đồ tiến bộ.
- Parent view read-only.
- Nhật ký thao tác.

## 9. Ngoài phạm vi MVP

- AI chấm hành vi tự động.
- Nhận diện khuôn mặt.
- Ví tiền/thanh toán thật.
- Xếp hạng công khai toàn trường.
- Chat tự do học sinh–học sinh.
- Gamification có yếu tố may rủi.

## 10. KPI đề xuất

- Giáo viên có thể ghi nhận một hành vi trong < 5 giây.
- ≥ 80% thao tác thường dùng thực hiện trên màn hình chính.
- ≥ 90% thay đổi điểm có lý do và lịch sử đầy đủ.
- Tỉ lệ dùng dashboard ít nhất 3 ngày/tuần với giáo viên hoạt động.
- Parent view tải nhanh, dễ đọc trên mobile.

## 11. Định hướng sản phẩm

Tên hiển thị có thể dùng **Ngôi Sao Lớp Học** hoặc **Phù Đổng Class Management**. Thiết kế nên gần gũi với học sinh lớp 1–5, sử dụng sao, huy hiệu, mascot, màu pastel; nhưng phần thao tác dành cho giáo viên phải sạch, rõ và chuyên nghiệp.
