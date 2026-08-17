# UI/UX Specification

## 1. Design direction

Tinh thần hình tham chiếu:
- Vui tươi, thân thiện, phù hợp học sinh tiểu học.
- Màu nền sáng, pastel, nhiều khoảng thở.
- Ngôi sao là motif chính.
- Illustration/mascot được dùng để tạo cảm giác tiến bộ.
- Card bo góc, icon rõ, nhãn ngắn.

Phần dành cho giáo viên cần giữ tính chuyên nghiệp: typography rõ, số liệu dễ scan, thao tác nhanh hơn trang trí.

## 2. Responsive strategy

### Desktop / tablet — Teacher-first
- Sidebar hoặc bottom navigation trên tablet.
- Dashboard dạng grid.
- Danh sách học sinh dạng card hoặc table tùy mật độ.
- Quick action luôn dễ truy cập.

### Mobile — Parent/student-first
- Bottom nav 4–5 mục.
- Card theo ngày.
- Nội dung theo timeline.
- Không nhồi nhiều biểu đồ.

## 3. Navigation đề xuất

### Giáo viên
1. Trang chủ
2. Học sinh
3. Nhiệm vụ
4. Tuyên dương
5. Thống kê
6. Thêm / Cài đặt

Quick actions floating hoặc sticky:
- + Cộng điểm
- − Ghi nhận cần cải thiện

### Phụ huynh
1. Hôm nay
2. Tiến bộ
3. Huy hiệu
4. Tuyên dương
5. Hồ sơ

## 4. Teacher dashboard

### Header
- Lớp 1/6
- Năm học 2026–2027
- Avatar giáo viên
- Search

### Summary row
- Điểm tích cực hôm nay
- Nhiệm vụ hoàn thành
- Huy hiệu mới
- Học sinh có hoạt động mới

### Student grid
Mỗi card:
- Avatar
- Tên
- Lifetime score / spendable stars
- Level badge
- Quick + / −
- Task status

### Activity panel
Timeline những thay đổi gần nhất.

## 5. Student detail

Hero:
- Avatar lớn
- Tên
- Chức vụ
- Level + progress bar tới level kế
- Lifetime score
- Spendable stars

Tabs:
- Tổng quan
- Hoạt động
- Nhiệm vụ
- Huy hiệu
- Quà
- Ghi chú

## 6. Score modal

Mục tiêu: thao tác cực nhanh.

### Bước 1
Nếu mở từ dashboard nhiều học sinh: chọn một hoặc nhiều học sinh.

### Bước 2
Tabs:
- Tích cực
- Cần cải thiện

Hiển thị preset dạng large tap target: icon + tên + điểm.

### Bước 3
Toast xác nhận. Cho phép Undo trong vài giây nhưng backend vẫn tạo adjustment khi undo.

## 7. Level progression

Không nên dùng hình ảnh “địa vị” quá mạnh theo hướng hơn-thua. Có thể vẫn giữ 5 giai đoạn nhưng đổi storytelling thành:
- Mầm sáng
- Ngôi sao nhỏ
- Nhà khám phá
- Người truyền cảm hứng
- Ngôi sao tỏa sáng

Nếu bám sát concept hình thì vẫn hỗ trợ bộ nhân vật 5 giai đoạn như tài liệu gốc.

## 8. Praise corner

Card:
- ảnh/video thumbnail
- tên học sinh
- lời tuyên dương
- ngày giờ
- reaction đơn giản

Nút `Đăng bài tuyên dương` chỉ cho teacher/admin.

## 9. Statistics

Biểu đồ nên có:
- Line chart tiến bộ tuần/tháng.
- Stacked bar positive vs needs-improvement.
- Distribution theo behavior category.
- Task completion rate.

Không dùng leaderboard mặc định.

## 10. Parent dashboard

Hero: `Hôm nay của Mai Anh`

Các card:
- `+8 điểm hôm nay`
- 2 lần phát biểu
- Hoàn thành nhiệm vụ
- Giúp đỡ bạn
- Lời cô giáo

Bên dưới là timeline và biểu đồ tiến bộ 7/30 ngày.

## 11. Design tokens đề xuất

### Color roles
- Primary: navy/blue tin cậy.
- Accent star: vàng ấm.
- Positive: xanh lá.
- Needs improvement: đỏ/coral dịu, không chói.
- Info: xanh dương nhạt.
- Reward: tím/lilac.
- Background: off-white/cream.

### Typography
Ưu tiên font Unicode tiếng Việt rõ ràng: Be Vietnam Pro, Inter hoặc system sans-serif.

### Radius
- Card: 16–24 px.
- Button: 12–16 px.

### Touch targets
Tối thiểu 44×44 px.

## 12. Accessibility

- Không dựa hoàn toàn vào màu để phân biệt +/−.
- Icon đi kèm text.
- Contrast AA cho nội dung chính.
- Hỗ trợ keyboard desktop.
- Có tùy chọn giảm animation.

## 13. Empty/error states

Ví dụ:
- Chưa có hoạt động: `Hôm nay lớp mình chưa có ghi nhận nào.`
- Chưa có huy hiệu: `Hãy cùng tạo những cột mốc đầu tiên!`
- Không có dữ liệu thống kê: hướng dẫn giáo viên bắt đầu ghi nhận hành vi.

## 14. Các component cần thiết

- AppShell
- ClassSwitcher
- StudentCard
- StudentAvatar
- LevelBadge
- ProgressBar
- ScoreChip
- QuickScoreButton
- BehaviorPresetCard
- ScoreTransactionRow
- TaskCard
- BadgeCard
- RewardCard
- PraisePostCard
- StatCard
- LineChartCard
- ActivityTimeline
- ParentDailySummary
- ConfirmDialog
- UndoToast

## 15. UX nguyên tắc dành cho lớp học

- Giáo viên không nên phải gõ nhiều.
- Hầu hết hành động thường xuyên phải dùng preset.
- Không che toàn màn hình lâu khi đang đứng lớp.
- Có bulk actions cho nhóm/tổ/cả lớp.
- Mọi hành động nhạy cảm có lịch sử rõ ràng.
