# Database security baseline

Ngày kiểm tra live: 2026-08-18 (Asia/Ho_Chi_Minh).

## Trạng thái Neon và Vercel đã xác minh

- Neon project `shiny-field-99523851`, branch `main` `br-small-dew-afcozbtg`, database `neondb`, PostgreSQL 18.4.
- Main có 28 bảng public. `neondb_owner` vẫn là owner/migration-recovery role và có `CREATEROLE`, `CREATEDB`, `BYPASSRLS`; role này không được dùng bởi Vercel runtime.
- Đã tạo `phudong_runtime`: `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOBYPASSRLS`, connection limit 10. Role chỉ có `USAGE` trên schema `public`, CRUD trên bảng public và `USAGE/SELECT` trên sequences; không có `CREATE`, `TRUNCATE`, `REFERENCES` hoặc `TRIGGER` trên `public.students`.
- Đã khôi phục `drizzle.__drizzle_migrations` trên main với 3 entry khớp hash/timestamp trong `src/db/migrations/meta/_journal.json`. `REQUIRE_MIGRATION_JOURNAL=true npm run db:drift` trả schema parity 28/28, journal match và không có diff bảng/cột/index/enum.
- Vercel Production đã có `DATABASE_URL_RUNTIME` và `REQUIRE_RUNTIME_ROLE=true` ở dạng encrypted. Preview cố ý chưa gán connection production để tránh mở rộng blast radius vào dữ liệu thật.
- Main vẫn có 0 bảng bật RLS và 0 policy. Database-level tenant isolation chưa được tuyên bố hoàn tất.

## Bằng chứng rollout runtime role

Branch rehearsal `br-rough-king-afqyhji2` được tạo từ main, chạy đúng role/grants/journal SQL, rồi xóa sau khi verify. Kết quả với connection của `phudong_runtime`: schema contract 28/28, role flags least-privilege không vi phạm, `publicCreate=false`, CRUD cần thiết là true và `TRUNCATE/REFERENCES/TRIGGER=false`.

Các thao tác production sau đó chỉ là additive metadata/ACL:

1. Tạo login role và cấp grants tối thiểu trên Neon main.
2. Tạo schema/table migration journal và ghi 3 baseline entries; không sửa/xóa bảng hoặc dữ liệu nghiệp vụ.
3. Ghi hai environment variables encrypted trên Vercel Production.
4. Deploy `dpl_EGYDhHXtesxCPCzpbu7zph3B8uby` ở trạng thái `READY`; `/api/health/db` trả `200` và không có runtime error trong giờ đầu sau deploy.

Không ghi password hoặc connection string vào repository/log.

## RLS status và lý do chưa bật trên main

RLS production hiện **chưa bật**. Code hiện dùng một Drizzle database proxy/pool dùng chung và nhiều query trực tiếp ngoài transaction; chưa có request-scoped `set_config('app.user_id', ..., true)` được bắt buộc xuyên suốt mọi authenticated request. Bật policy ngay lúc này có thể làm query hợp lệ trả 0 dòng hoặc tạo bypass không nhất quán tùy đường đi.

Đây là blocker kỹ thuật, không phải blocker quyền truy cập. Phase RLS tiếp theo cần:

1. Tạo request-context database wrapper, chỉ cho phép authenticated query chạy trong transaction đã set `app.user_id` và organization/class context.
2. Refactor toàn bộ service/query path và kiểm tra không còn query authenticated nào chạy ngoài wrapper.
3. Áp dụng policy theo dependency order: organization/membership → class/student → guardian → activity/configuration/audit/media.
4. Chạy branch integration với runtime role cho `SELECT`, `INSERT`, `UPDATE`, `DELETE`, cross-tenant denial và rollback rehearsal.
5. Chỉ sau đó mới bật RLS/`FORCE ROW LEVEL SECURITY` theo từng nhóm bảng trên main.

Trong thời gian này, boundary hoạt động là session → server-side authorization → tenant-scoped Drizzle query, được gia cố bởi runtime role least privilege.

## Controls đang hoạt động trước RLS

- Teacher/admin/guardian access được kiểm tra server-side theo class/organization/student relation.
- Teacher/guardian read-write flows kiểm tra school year active và lớp chưa archived.
- Mutation routes dùng authenticated session, centralized same-origin check và `Cache-Control: no-store`.
- Score/reward dùng transaction, advisory lock, guarded balance update và audit/idempotency.
- Import mặc định tạo guardian relation `canView=false` cho đến khi teacher link/invite.

## Kiểm tra tự động

- `npm run security:routes` kiểm kê mọi mutation route dưới `src/app/api`, yêu cầu same-origin/no-store; auth handler và signed Blob callback là ngoại lệ có giao thức riêng.
- `npm run db:verify` chạy schema contract trên connection được chọn; với `REQUIRE_LEAST_PRIVILEGE=true` phải dùng runtime role.
- `npm run db:verify-runtime` kiểm tra role identity, schema usage và table privileges trực tiếp.
- `npm run db:drift` đối chiếu snapshot bảng/cột/index/enum và SHA-256/timestamp của migration journal. Owner/recovery connection dùng cho drift; runtime role không được cấp quyền migration.
- `REQUIRE_RUNTIME_ROLE=true` là guard fail-closed: thiếu `DATABASE_URL_RUNTIME` sẽ không fallback về owner `DATABASE_URL`.
