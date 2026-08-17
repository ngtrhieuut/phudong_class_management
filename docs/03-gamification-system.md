# Gamification System

## 1. Triết lý

Gamification chỉ là công cụ hỗ trợ hình thành thói quen tốt. Không dùng để gắn nhãn “học sinh tốt/xấu”, không công khai xếp hạng mặc định và không để việc đổi quà làm mất thành quả tiến bộ dài hạn.

## 2. Hai loại điểm

### Lifetime Score
Dùng để xác định level/cấp độ nhân vật. Chỉ phản ánh tổng thành quả dài hạn và không bị giảm khi đổi quà.

### Spendable Stars
Dùng để đổi quà. Có thể tăng khi nhận hành vi tích cực và giảm khi đổi quà.

Khuyến nghị: hành vi “cần cải thiện” làm giảm spendable stars nhưng không hạ lifetime score dưới mốc level đã đạt, trừ khi trường muốn cấu hình khác.

## 3. Level nhân vật

Theo ảnh tham chiếu:

| Level | Điểm | Gợi ý hình ảnh |
|---|---:|---|
| Giai đoạn 1 | 0–49 | Học sinh nhỏ |
| Giai đoạn 2 | 50–149 | Học sinh trưởng thành hơn |
| Giai đoạn 3 | 150–299 | Nhân vật phiêu lưu |
| Giai đoạn 4 | 300–499 | Siêu anh hùng |
| Giai đoạn 5 | 500+ | Vua/ngôi sao lớp học |

Tên level có thể thay đổi để phù hợp văn hóa trường. Nên cho phép admin/giáo viên cấu hình threshold.

## 4. Điểm hành vi

### Positive presets
- Phát biểu bài: +5
- Giúp đỡ bạn: +2
- Hoàn thành bài tập: +3 hoặc +5
- Tham gia nhóm tích cực: +2
- Vở sạch chữ đẹp: +2
- Đi học đúng giờ: +5
- Tham gia phong trào: +2

### Needs-improvement presets
- Đi học muộn: -5
- Không làm bài tập: -2
- Nói chuyện trong lớp: -3
- Vi phạm nội quy: -5
- Ra khỏi chỗ ngồi: -3
- Xả rác/bừa bộn: -3

Tất cả chỉ là giá trị mặc định và phải cấu hình được.

## 5. Huy hiệu

Huy hiệu có thể được trao theo 2 cơ chế:
- Manual: giáo viên chọn học sinh và trao.
- Rule-based: hệ thống tự động gợi ý/trao khi đạt điều kiện.

Ví dụ rule:
- `Dũng sĩ phát biểu`: 10 lần phát biểu tích cực trong tháng.
- `Giúp đỡ bạn bè`: 5 lần được ghi nhận giúp bạn.
- `Tiến bộ vượt bậc`: điểm tích cực tăng rõ so với tuần trước.
- `Giữ vệ sinh tốt`: 10 lần hoàn thành nhiệm vụ vệ sinh.

## 6. Nhiệm vụ

Mỗi nhiệm vụ gồm:
- title
- description
- scope: student / group / class
- period: daily / weekly / custom
- reward_stars
- completion_mode: manual / rule-based
- due_at

## 7. Kho quà

Reward gồm:
- Tên quà.
- Icon/ảnh.
- Cost stars.
- Loại: privilege / activity / physical / recognition.
- Stock nếu cần.
- Thời hạn hiệu lực.
- Approval required.

Khuyến nghị ưu tiên privilege/activity, ví dụ chọn bài hát, chọn trò chơi, làm trợ lý giáo viên.

## 8. Anti-abuse

- Mọi thay đổi điểm phải có actor và timestamp.
- Không hard-delete giao dịch điểm.
- Có adjustment transaction.
- Có daily limit tùy chọn cho mỗi loại hành vi.
- Cảnh báo khi giáo viên nhập điểm bất thường.
- Cho phép admin audit lịch sử.

## 9. Không nên triển khai

- Loot box/quay thưởng.
- Leaderboard công khai mặc định.
- “Mất level” vì đổi quà.
- Phạt điểm quá sâu gây âm lớn.
- Badge mang tính chê bai.

## 10. UX feedback

Positive action: animation ngôi sao nhỏ, âm thanh tùy chọn, toast ngắn.

Negative action: phản hồi nhẹ, trung tính; không dùng animation gây xấu hổ.
