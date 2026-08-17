# MVP Roadmap

## Phase 0 — Product foundation

- Chốt tên sản phẩm, đối tượng và nguyên tắc gamification.
- Chốt schema dữ liệu.
- Chốt quyền teacher / guardian / student / admin.
- Thiết lập design system cơ bản.

**Exit criteria:** có wireframe chính, data model, role matrix và backlog MVP.

## Phase 1 — Core classroom

- Authentication.
- Tạo lớp, năm học.
- CRUD học sinh.
- Danh sách học sinh.
- Chức vụ/tổ.
- Behavior templates.
- Cộng/trừ điểm.
- Score ledger + adjustment.
- Dashboard cơ bản.

**Exit criteria:** giáo viên có thể quản lý một lớp thật và ghi nhận hành vi trong <5 giây.

## Phase 2 — Gamification

- Lifetime score + spendable stars.
- Level progression.
- Huy hiệu.
- Nhiệm vụ ngày/tuần.
- Kho quà + redeem flow.

**Exit criteria:** mỗi học sinh có progression rõ và dữ liệu không mất khi đổi quà.

## Phase 3 — Praise & parent view

- Góc tuyên dương.
- Upload ảnh/video.
- Parent account/linking.
- Parent daily summary.
- Visibility controls.

**Exit criteria:** phụ huynh chỉ xem được dữ liệu con mình và có thể theo dõi tiến bộ trên mobile.

## Phase 4 — Analytics & polish

- Weekly/monthly charts.
- Behavior breakdown.
- Task completion.
- Filter/search.
- Accessibility.
- Empty/error states.
- Audit log UI.
- PWA install foundation: manifest, icons, standalone metadata and safe static-asset service-worker cache.
- Teacher report exports: activity ledger, task assignments and monthly CSV summary with class authorization.
- Internal teacher notification center for task/reward operational events.

## Phase 5 — Pilot

Pilot với 1 lớp trước khi mở rộng.

Theo dõi:
- số lần teacher dùng quick score/ngày;
- thời gian thao tác;
- lỗi nhập nhầm;
- số lần parent mở app;
- phản hồi về áp lực điểm số;
- hành vi/preset nào thực sự hữu ích.

## Backlog sau MVP

- Offline queue cho thao tác ghi điểm (chưa bật để tránh ghi dữ liệu nhạy cảm ngoài kiểm soát).
- Push notification.
- Import học sinh từ Excel/Google Sheet.
- Export báo cáo PDF/Excel (CSV reports are available in MVP).
- Multi-class teacher dashboard.
- School admin CRUD/configuration dashboard.
- Rule engine cho badge/task tự động.
- AI gợi ý nhận xét tuần dựa trên dữ liệu có cấu trúc, giáo viên duyệt trước khi gửi.
- Template lớp theo khối 1–5.

## Ưu tiên phát triển

P0: auth, lớp, học sinh, score ledger, quick scoring, permissions.

P1: level, badge, task, reward, parent view, praise feed.

P2: analytics nâng cao, automation, import/export, AI assistant.
