# Database security baseline

Ngày kiểm tra live: 2026-08-18 (Asia/Ho_Chi_Minh).

## Trạng thái Neon đã xác minh

- Project `shiny-field-99523851`, branch `main` `br-small-dew-afcozbtg`, database `neondb`, PostgreSQL 18.4.
- Main đang kết nối bằng `neondb_owner`; role có `CREATEROLE`, `CREATEDB`, `BYPASSRLS`.
- Các bảng `public` hiện chưa bật RLS và chưa có policy; chưa có application runtime role riêng.
- Vì vậy database-level tenant isolation chưa hoàn tất. Boundary đang chạy hiện tại là session → service authorization → tenant-scoped Drizzle query.

## Kế hoạch runtime role/RLS

1. Tạo login role riêng, `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`, chỉ cấp schema/table/sequence privileges cần thiết.
2. Đặt `DATABASE_URL_RUNTIME` trên Vercel; giữ owner URL chỉ cho migration/recovery job.
3. Trong transaction authenticated đặt `app.user_id` và tenant context bằng `set_config(..., true)`.
4. Áp dụng policy theo dependency order, kiểm tra cả `USING` và `WITH CHECK`, rồi mới bật `FORCE ROW LEVEL SECURITY`.
5. Chỉ chuyển main sau integration suite bằng runtime role và branch rollback rehearsal pass.

Branch rehearsal `br-empty-scene-afpgv9al` đã được dùng để kiểm tra role least-privilege và policy mẫu. Những thay đổi đó không được áp dụng vào main. Production RLS/runtime role vẫn là blocker cần approval riêng vì có thể làm mất quyền đọc/ghi nếu policy hoặc secret sai.

## Controls đang hoạt động trước RLS

- Teacher/admin/guardian access đều được kiểm tra server-side theo class/organization/student relation.
- Teacher/guardian read-write flows còn kiểm tra lớp thuộc school year active và chưa có cờ `settingsJson.archived`, nên stale client không thể tiếp tục thao tác lớp đã lưu trữ.
- Mutation routes dùng authenticated session, same-origin check cho mutation và `Cache-Control: no-store`.
- Score/reward dùng transaction, advisory lock, guarded balance update và audit/idempotency.
- Import mặc định tạo guardian relation `canView=false` cho đến khi được teacher link/invite.
