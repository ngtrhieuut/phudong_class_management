# Ngôi Sao Lớp Học — Phu Dong Class Management

Web quản lý lớp học theo hướng **quản lý – động viên – tuyên dương học sinh**, lấy cảm hứng từ concept “Mỗi hành động tốt – Một ngôi sao sáng!”.

Mục tiêu của sản phẩm là giúp giáo viên tiểu học ghi nhận hành vi tích cực hằng ngày, quản lý điểm thưởng/phạt, nhiệm vụ, huy hiệu, quà tặng, tiến bộ học sinh và nội dung tuyên dương; đồng thời tạo một kênh theo dõi đơn giản cho phụ huynh.

## Stack đã chọn

- **Frontend:** Next.js + TypeScript + Tailwind CSS.
- **Database:** Neon PostgreSQL.
- **ORM/query layer:** ưu tiên Drizzle ORM.
- **Authentication:** ưu tiên Neon Auth; fallback Auth.js nếu có blocker thực tế.
- **Deployment:** Vercel.
- **Source control:** GitHub.
- **Validation:** Zod.
- **Testing:** unit/integration + Playwright E2E.

Codex phải sử dụng **Neon MCP, GitHub Connector và Vercel Connector** để kiểm tra và kiểm soát trạng thái thực tế của database, source code và deployment. Chi tiết tại `AGENTS.md` và `docs/09-codex-mcp-workflow.md`.

## Tài liệu dự án

- `docs/01-product-brief.md` — Product brief chi tiết, mục tiêu, đối tượng, phạm vi.
- `docs/02-functional-spec.md` — Đặc tả chức năng, quyền người dùng, user stories.
- `docs/03-gamification-system.md` — Hệ thống điểm, cấp độ, huy hiệu, nhiệm vụ, phần thưởng.
- `docs/04-data-model.md` — Mô hình dữ liệu đề xuất.
- `docs/05-ui-ux-spec.md` — Kiến trúc màn hình, component và nguyên tắc UX/UI.
- `docs/06-mvp-roadmap.md` — Lộ trình MVP và tiêu chí nghiệm thu.
- `docs/07-security-privacy.md` — Bảo mật, quyền riêng tư và dữ liệu học sinh.
- `docs/08-implementation-guide.md` — Kiến trúc kỹ thuật Neon/Vercel và cách triển khai.
- `docs/09-codex-mcp-workflow.md` — Quy trình Codex dùng Neon MCP + GitHub + Vercel Connector.
- `docs/10-production-hardening.md` — baseline security, RLS strategy và authenticated test gate.
- `docs/11-disaster-recovery.md` — migration, backup và recovery workflow.
- `docs/12-privacy-retention-media.md` — phân loại, retention và media handling.
- `docs/security-e2e-fixtures.md` — fixture isolation và gate cho authenticated security E2E.
- `AGENTS.md` — Luật bắt buộc cho Codex/AI coding agent khi phát triển repo.
- `.env.example` — template environment variables, không chứa secret.
- `assets/reference/class-management-concept.jpg` — ảnh concept tham chiếu đã tối ưu dung lượng.

## Chạy và kiểm tra

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Các route teacher và parent đều dùng server-side session guard; dữ liệu lớp/học sinh được đọc qua Drizzle và Neon, không dùng fixture khi chạy production. Teacher có thể đổi lớp bằng `classId`, nhập danh sách `.xlsx/.csv` (có [template CSV](public/templates/student-import-template.csv)), xuất danh sách và báo cáo CSV theo activity/task/tháng, ghi nhận điểm có `Idempotency-Key`, tạo nhiệm vụ, đổi quà, đăng tuyên dương, xem notification center và quản lý liên kết phụ huynh theo từng học sinh. Parent chỉ đọc được học sinh có quan hệ guardian hợp lệ.

Liên kết guardian hỗ trợ hai cách: liên kết ngay với account đã đăng nhập, hoặc tạo invitation token một lần có hạn dùng; phụ huynh phải đăng nhập đúng email nhận lời mời trước khi xác nhận. Thu hồi sẽ tắt quyền xem và nhận thông báo nhưng vẫn giữ audit log.

Ảnh/video tuyên dương dùng private Vercel Blob, client upload trực tiếp để không đi qua giới hạn body của Vercel Function; DB chỉ lưu metadata và URL private. Nếu chưa tạo Blob store, chức năng text/parent vẫn hoạt động và upload sẽ fail-closed với thông báo cấu hình storage.

Ứng dụng có PWA foundation: manifest, icon, standalone metadata và service worker chỉ cache app shell/static assets. Các route teacher, parent và API chứa dữ liệu học sinh không được cache.

Production responses bật các security headers cơ bản (nosniff, frame deny, strict referrer policy và permissions policy). Health check dùng `Cache-Control: no-store` để monitoring không nhận trạng thái cũ.

## Database và deployment

1. Sao chép `.env.example` thành `.env.local` và điền `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`.
2. Người dùng có thể đăng ký tài khoản tại `/auth/sign-up`; Neon Auth xử lý password/session, còn application user được đồng bộ khi truy cập route được bảo vệ.
3. Kiểm tra migration bằng `npm run db:check` và thử migration trên Neon branch trước khi apply vào main.
4. Chỉ chạy `npm run db:migrate` khi đã xác nhận đúng database/branch; không commit secret hoặc file `.vercel`.
5. Sau khi push `main`, kiểm tra deployment trên Vercel và gọi `/api/health/db`. Các route protected phải redirect về `/auth/sign-in` khi chưa đăng nhập.

Seed trong `src/db/seed.ts` chỉ dành cho môi trường demo/local. Dữ liệu danh sách học sinh thật phải đi qua import có preview, validation, duplicate detection và audit log; không tự động seed dữ liệu PII vào production.

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
