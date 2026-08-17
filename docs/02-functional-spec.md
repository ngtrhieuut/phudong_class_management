# Functional Specification

## 1. Roles & permissions

| Chức năng | Giáo viên | Phụ huynh | Học sinh | Admin |
|---|---:|---:|---:|---:|
| Xem lớp | ✓ | con mình | con mình | ✓ |
| Tạo/sửa học sinh | ✓ | — | — | ✓ |
| Cộng/trừ điểm | ✓ | — | — | ✓ |
| Sửa giao dịch điểm | điều chỉnh | — | — | ✓ |
| Giao nhiệm vụ | ✓ | xem | xem | ✓ |
| Trao huy hiệu | ✓ | xem | xem | ✓ |
| Đổi quà | ✓ | xem | xem | ✓ |
| Đăng tuyên dương | ✓ | xem nếu được phép | xem | ✓ |
| Xem thống kê | ✓ | con mình | bản thân | ✓ |
| Quản lý template hành vi | ✓ | — | — | ✓ |

## 2. Dashboard giáo viên

Hiển thị:
- Tên lớp, năm học, số học sinh.
- Tổng điểm tích cực hôm nay.
- Nhiệm vụ hôm nay.
- Học sinh cần chú ý.
- Thành tích gần đây.
- Quick actions: Cộng điểm, Trừ điểm, Giao nhiệm vụ, Tuyên dương.
- Danh sách học sinh dạng card, có avatar, điểm hiện tại, level, trạng thái nhiệm vụ.

### Quick score action

Flow mục tiêu:
1. Chạm học sinh.
2. Chọn `+` hoặc `-`.
3. Chọn hành vi preset.
4. Xác nhận hoặc hệ thống auto-save.

Hỗ trợ chọn nhiều học sinh để cộng điểm nhóm.

## 3. Quản lý học sinh

Mỗi hồ sơ gồm:
- Họ tên.
- Tên gọi ngắn.
- Ngày sinh.
- Giới tính (tùy chọn).
- Avatar.
- Mã học sinh.
- Chức vụ lớp.
- Phụ huynh liên kết.
- Tổng điểm.
- Level hiện tại.
- Huy hiệu.
- Nhiệm vụ.
- Lịch sử hành vi.
- Ghi chú riêng của giáo viên.

## 4. Hệ thống cộng điểm

Preset từ ảnh tham chiếu:
- Phát biểu bài: +5.
- Giúp đỡ bạn: +2.
- Làm bài tập đầy đủ: có thể +3/+5; nên cấu hình thay vì hard-code.
- Tham gia nhóm tích cực: +2.
- Vở sạch chữ đẹp: +2.
- Đi học đúng giờ: +5.
- Tham gia phong trào: +2.

Giáo viên có thể tạo/sửa preset với:
- Tên hành vi.
- Icon.
- Số điểm mặc định.
- Nhóm hành vi.
- Mức độ hiển thị cho phụ huynh.
- Active/inactive.

## 5. Hệ thống trừ điểm

Preset tham chiếu:
- Đi học muộn: -5.
- Không làm bài tập: -2.
- Nói chuyện trong lớp: -3.
- Vi phạm nội quy: -5.
- Ra khỏi chỗ ngồi: -3.
- Xả rác/bừa bộn: -3 hoặc cấu hình.

Nguyên tắc:
- Không xóa lịch sử giao dịch điểm đã tạo.
- Nếu giáo viên nhập nhầm, tạo `adjustment transaction` đảo ngược.
- Có thể cấu hình giới hạn trừ điểm mỗi ngày.
- UI phải dùng ngôn ngữ “cần cải thiện” thay vì tạo cảm giác bêu tên.

## 6. Chức vụ trong lớp

Ví dụ:
- Lớp trưởng.
- Lớp phó học tập.
- Lớp phó văn–thể–mỹ.
- Lớp phó lao động.
- Tổ trưởng.
- Tổ phó.

Chức vụ là metadata, không tự động cộng điểm trừ khi giáo viên cấu hình nhiệm vụ tương ứng.

## 7. Huy hiệu

Ví dụ:
- Siêu chăm học.
- Giúp đỡ bạn bè.
- Vở sạch chữ đẹp.
- Dũng sĩ phát biểu.
- Giữ vệ sinh tốt.
- Tiến bộ vượt bậc.

Mỗi huy hiệu có:
- Tên, icon, mô tả.
- Tiêu chí tự động hoặc giáo viên trao thủ công.
- Ngày nhận.
- Có/không hiển thị với phụ huynh.

## 8. Nhiệm vụ

Nhiệm vụ ngày/tuần:
- Phát biểu ít nhất 1 lần.
- Hoàn thành bài tập.
- Giúp một bạn.
- Giữ bàn học sạch.

Trạng thái: `pending`, `completed`, `expired`, `cancelled`.

Có thể cộng điểm khi hoàn thành.

## 9. Kho quà

Ví dụ tham chiếu:
- 20 sao: chọn chỗ ngồi yêu thích.
- 30 sao: chọn trò chơi cuối tiết.
- 50 sao: sticker bất kỳ.
- 80 sao: trợ lý cô giáo 1 ngày.
- 100 sao: chọn bài hát khởi động.
- 150 sao: được tuyên dương đặc biệt.

Quà không nhất thiết là vật phẩm. Khuyến nghị ưu tiên đặc quyền giáo dục/hoạt động vui vẻ.

Flow đổi quà:
1. Học sinh/giáo viên chọn quà.
2. Kiểm tra điểm khả dụng.
3. Giáo viên xác nhận.
4. Tạo reward redemption và trừ điểm khả dụng nếu cấu hình dùng “spendable points”.

Nên tách `lifetime score` và `spendable stars` để việc đổi quà không làm tụt level.

## 10. Góc tuyên dương

Post gồm:
- Học sinh hoặc nhóm học sinh.
- Tiêu đề/ngắn gọn.
- Nội dung.
- Ảnh/video.
- Loại thành tích.
- Reaction đơn giản nếu cần.
- Quyền riêng tư: lớp / phụ huynh liên quan / giáo viên.

Không khuyến nghị feed công khai ngoài lớp trong MVP.

## 11. Thống kê

Các view:
- Theo ngày/tuần/tháng.
- Theo học sinh.
- Theo loại hành vi.
- Điểm tích cực vs cần cải thiện.
- Huy hiệu đã nhận.
- Nhiệm vụ hoàn thành.
- Top hành vi tích cực của cả lớp.

Tránh dùng leaderboard mặc định để giảm áp lực cạnh tranh.

## 12. Phụ huynh theo dõi

Màn hình mobile-first:
- Hôm nay con có gì nổi bật.
- Điểm thay đổi hôm nay.
- Hành vi tích cực.
- Nhiệm vụ hoàn thành/chưa hoàn thành.
- Huy hiệu mới.
- Lời nhắn giáo viên.
- Tiến bộ tuần/tháng.

## 13. Notifications

MVP nên có in-app notification; email/push là phase sau.

Sự kiện phù hợp:
- Huy hiệu mới.
- Nhiệm vụ quan trọng.
- Bài tuyên dương mới.
- Báo cáo tuần.

Không gửi notification cho từng lần trừ điểm nhỏ để tránh gây căng thẳng phụ huynh–học sinh.

## 14. Search/filter

- Tìm học sinh theo tên.
- Filter theo tổ, chức vụ, level, nhiệm vụ.
- Filter timeline theo positive/needs-improvement/badge/task/reward.
