# Ngôi Sao Lớp Học — Phu Dong Class Management

Web quản lý lớp học theo hướng **quản lý – động viên – tuyên dương học sinh**, lấy cảm hứng từ concept “Mỗi hành động tốt – Một ngôi sao sáng!”.

Mục tiêu của sản phẩm là giúp giáo viên tiểu học ghi nhận hành vi tích cực hằng ngày, quản lý điểm thưởng/phạt, nhiệm vụ, huy hiệu, quà tặng, tiến bộ học sinh và nội dung tuyên dương; đồng thời tạo một kênh theo dõi đơn giản cho phụ huynh.

## Tài liệu dự án

- `docs/01-product-brief.md` — Product brief chi tiết, mục tiêu, đối tượng, phạm vi.
- `docs/02-functional-spec.md` — Đặc tả chức năng, quyền người dùng, user stories.
- `docs/03-gamification-system.md` — Hệ thống điểm, cấp độ, huy hiệu, nhiệm vụ, phần thưởng.
- `docs/04-data-model.md` — Mô hình dữ liệu đề xuất.
- `docs/05-ui-ux-spec.md` — Kiến trúc màn hình, component và nguyên tắc UX/UI.
- `docs/06-mvp-roadmap.md` — Lộ trình MVP và tiêu chí nghiệm thu.
- `docs/07-security-privacy.md` — Bảo mật, quyền riêng tư và dữ liệu học sinh.
- `docs/08-implementation-guide.md` — Gợi ý kiến trúc kỹ thuật và cách triển khai.
- `AGENTS.md` — Hướng dẫn cho Codex/AI coding agent khi phát triển repo.
- `assets/reference/class-management-concept.jpg` — Ảnh concept tham chiếu đã tối ưu dung lượng.

## Phạm vi MVP khuyến nghị

1. Quản lý lớp và danh sách học sinh.
2. Cộng/trừ điểm với lý do có cấu hình.
3. Cấp độ nhân vật theo tổng điểm.
4. Nhiệm vụ ngày/tuần.
5. Huy hiệu và kho quà.
6. Góc tuyên dương.
7. Thống kê tiến bộ theo học sinh và cả lớp.
8. Chế độ phụ huynh chỉ xem dữ liệu của con.
9. Nhật ký thay đổi điểm để tránh sửa/xóa thiếu kiểm soát.

## Tinh thần sản phẩm

- Tích cực trước, kỷ luật sau: ưu tiên ghi nhận hành vi tốt hơn là tạo cảm giác “chấm điểm đạo đức”.
- Giao diện nhanh, ít thao tác, phù hợp giáo viên đang đứng lớp.
- Hình ảnh vui tươi, thân thiện với học sinh lớp 1–5 nhưng không quá “game hóa” đến mức gây áp lực cạnh tranh.
- Dữ liệu học sinh phải được phân quyền chặt chẽ và có lịch sử thay đổi.
