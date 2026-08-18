# Database security baseline

Ngày kiểm tra live: 2026-08-18 (Asia/Ho_Chi_Minh).

## Trạng thái Neon đã xác minh

- Project `shiny-field-99523851`, branch `main` `br-small-dew-afcozbtg`, database `neondb`, PostgreSQL 18.4.
- Main đang kết nối bằng `neondb_owner`; role có `CREATEROLE`, `CREATEDB`, `BYPASSRLS`.
- Các bảng `public` hiện chưa bật RLS và chưa có policy; chưa có application runtime role riêng.
- Kiểm tra live ngày 2026-08-18 xác nhận 28 bảng public, owner của các bảng là `neondb_owner`, không có bảng `__drizzle_migrations` trong `public` hoặc schema khác được Neon MCP nhìn thấy. Vì vậy migration tag không thể được đối chiếu từ journal live; schema contract vẫn được đối chiếu bằng snapshot/index/enum qua `npm run db:drift`.
- Vercel environment-name audit (read-only, 2026-08-18): Production có `DATABASE_URL` và `DATABASE_URL_UNPOOLED` nhưng chưa có `DATABASE_URL_RUNTIME`; Preview hiện chưa có environment variables. Vì vậy chưa có bằng chứng rằng Vercel runtime đang dùng least-privilege connection.
- Vì vậy database-level tenant isolation chưa hoàn tất. Boundary đang chạy hiện tại là session → service authorization → tenant-scoped Drizzle query.

## Kế hoạch runtime role/RLS

1. Tạo login role riêng, `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`, chỉ cấp schema/table/sequence privileges cần thiết.
2. Đặt `DATABASE_URL_RUNTIME` trên Vercel; giữ owner URL chỉ cho migration/recovery job.
3. Trong transaction authenticated đặt `app.user_id` và tenant context bằng `set_config(..., true)`.
4. Áp dụng policy theo dependency order, kiểm tra cả `USING` và `WITH CHECK`, rồi mới bật `FORCE ROW LEVEL SECURITY`.
5. Chỉ chuyển main sau integration suite bằng runtime role và branch rollback rehearsal pass.

Branch rehearsal `br-empty-scene-afpgv9al` đã được dùng để kiểm tra role least-privilege và policy mẫu. Những thay đổi đó không được áp dụng vào main. Production RLS/runtime role vẫn là blocker cần approval riêng vì có thể làm mất quyền đọc/ghi nếu policy hoặc secret sai.

Kết quả transaction rehearsal đã xác nhận: role có `USAGE` nhưng không có `CREATE` trên schema `public`, có `SELECT` trên `public.users` nhưng không có `TRUNCATE`, và khi `app.user_id` là UUID không tồn tại thì policy `users_self_read` trả 0 dòng. Neon schema diff của branch chỉ chứa ACL/policy thử nghiệm; không có schema diff trên main.

Trong lần kiểm thử integration ngày 2026-08-18, branch tạm `br-cold-glade-afy831xp` được provision Neon Auth và dùng bốn tài khoản fixture riêng cùng hai organization/class. Login role `phudong_runtime_e2e` trên branch có `SUPERUSER/CREATEROLE/CREATEDB/BYPASSRLS=false`, `USAGE=true`, `CREATE=false`, `SELECT=true`, `TRUNCATE=false`; `npm run db:verify` với connection string của role trả `28/28` bảng, không thiếu cột/index và không có least-privilege violation. Branch không ghi dữ liệu vào `main` và được xem là disposable test fixture.

## Controls đang hoạt động trước RLS

- Teacher/admin/guardian access đều được kiểm tra server-side theo class/organization/student relation.
- Teacher/guardian read-write flows còn kiểm tra lớp thuộc school year active và chưa có cờ `settingsJson.archived`, nên stale client không thể tiếp tục thao tác lớp đã lưu trữ.
- Mutation routes dùng authenticated session, same-origin check cho mutation và `Cache-Control: no-store`.
- Score/reward dùng transaction, advisory lock, guarded balance update và audit/idempotency.
- Import mặc định tạo guardian relation `canView=false` cho đến khi được teacher link/invite.

## Kiểm tra tự động

- `npm run security:routes` kiểm kê mọi mutation route dưới `src/app/api`, yêu cầu policy same-origin dùng chung và `no-store`; chỉ cho phép ngoại lệ auth handler và signed Vercel Blob callback.
- `npm run db:drift` so sánh bảng/cột/index/enum trong migration snapshot với Neon. Khi CI bật `ENABLE_DB_VERIFY=true`, `REQUIRE_MIGRATION_JOURNAL=true` sẽ làm pipeline fail nếu migration journal chưa được tạo/khôi phục; không tự ý tạo journal trên main trong phase này.
