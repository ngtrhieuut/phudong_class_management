# Production hardening baseline

Ngày kiểm tra live: 2026-08-18 (Asia/Ho_Chi_Minh).

## Neon baseline đã xác minh

- Project: `shiny-field-99523851`; branch chính: `br-small-dew-afcozbtg` (`main`); database: `neondb`.
- PostgreSQL: `18.4 (c9a59a4)`.
- Runtime hiện kết nối bằng role `neondb_owner`.
- `neondb_owner` có `CREATEROLE`, `CREATEDB` và `BYPASSRLS`; đây không phải least privilege.
- 28 bảng trong `public` hiện chưa bật RLS và chưa có policy. Không được bật RLS trực tiếp trên `main` cho đến khi toàn bộ request path đã có policy tương ứng.
- Public schema và các bảng public đang thuộc owner `neondb_owner`; chưa có application runtime role riêng.
- Vercel environment-name audit read-only: Production hiện có `DATABASE_URL`/`DATABASE_URL_UNPOOLED` nhưng chưa có `DATABASE_URL_RUNTIME`; Preview chưa có environment variables. Không suy ra least privilege từ việc project đã liên kết với Neon.
- `npm run db:drift` đã được thêm để so sánh migration snapshot với live Neon. Main hiện không có `__drizzle_migrations`, nên strict migration-tag verification vẫn là blocker vận hành cần xử lý trong một migration/recovery change được duyệt.

Kết luận: tenant isolation hiện được thực thi ở service/query layer. Đây là defense-in-depth đang chạy, nhưng chưa thể tuyên bố database-level isolation hoàn tất.

## Strategy cho runtime role + RLS

1. Tạo login role riêng, không `SUPERUSER`, không `CREATEDB`, không `CREATEROLE`, không `BYPASSRLS`, chỉ có quyền `USAGE` schema, CRUD trên bảng cần thiết và sequence usage.
2. Vercel chỉ nhận connection string của role này qua `DATABASE_URL_RUNTIME`; không dùng owner connection ở runtime. `DATABASE_URL_UNPOOLED`/owner chỉ dùng cho migration job được kiểm soát.
3. Mỗi transaction authenticated đặt request context bằng `set_config('app.user_id', '<Neon Auth user id>', true)` và (khi cần) `app.organization_ids`. Không lấy tenant/user từ dữ liệu client.
4. Bật RLS theo dependency order: `organizations`/memberships → classes/students → guardian graph → activity/configuration/audit/media. Mỗi bảng có policy `USING` và `WITH CHECK`; kiểm thử cả `SELECT`, `INSERT`, `UPDATE`, `DELETE` và cross-tenant denial.
5. Chỉ bật `FORCE ROW LEVEL SECURITY` sau khi đã chạy integration suite bằng runtime role và kiểm tra migration rollback trên branch.

## Branch verification

Branch thử nghiệm `br-empty-scene-afpgv9al` đã được tạo từ main. Trên branch này đã thử:

- role `phudong_runtime_test` với các attribute least-privilege;
- schema usage, CRUD table grants và sequence usage;
- policy mẫu cho `public.users` dựa trên `current_setting('app.user_id', true)`.

Các thay đổi này chỉ tồn tại trên branch thử nghiệm. Chưa có role/RLS nào được áp dụng vào Neon main và chưa đổi Vercel environment variable.

## Điều kiện để áp dụng main

Đây là thay đổi production có thể làm app mất quyền đọc/ghi nếu policy hoặc connection string sai. Cần một approval riêng để:

- tạo login role + password rotation;
- cập nhật Vercel `DATABASE_URL_RUNTIME` cho Production/Preview;
- áp dụng migration RLS sau khi branch integration suite pass;
- giữ owner URL chỉ trong migration/recovery workflow.

Cho đến khi approval và test này hoàn tất, báo cáo phải ghi rõ: **RLS production chưa bật; app-layer authorization đang là boundary chính**.

## Authenticated integration gate

`tests/e2e/authenticated-security.spec.ts` kiểm tra qua HTTP/API teacher cross-class, guardian child/media isolation, admin tenant scope, invitation valid/wrong-email/expired/revoked/replay/concurrency và score/reward atomicity. CI chỉ chạy suite này khi repository variable `ENABLE_AUTH_E2E=true` và toàn bộ fixture secrets `E2E_*` cùng connection/auth secrets đã được cấu hình. Khi chưa có fixture riêng, CI phát notice và không được diễn giải thành kết quả authenticated PASS.

Fixture phải là tài khoản/test data riêng, không dùng tài khoản giáo viên hoặc dữ liệu học sinh production. Bộ fixture đầy đủ gồm hai class/teacher scope, child được phép và child ngoài scope, media ngoài scope, revoked/canView=false guardian, foreign organization, các invitation token theo từng trạng thái, và balance-limited reward fixtures. Sau mỗi lần chạy cần kiểm tra cleanup/idempotency key và giữ lại trace khi test retry thất bại.

`npm run db:verify` là schema-contract check read-only đối với Neon connection được chọn. CI chỉ chạy live check khi repository variable `ENABLE_DB_VERIFY=true`; khi bật phải cung cấp runtime connection riêng qua `DATABASE_URL_RUNTIME`, không dùng migration/owner URL làm application verification role.

`npm run security:routes` là gate tĩnh cho centralized same-origin/no-store policy trên toàn bộ API mutation route. Auth SDK route và signed Blob callback là hai ngoại lệ có giao thức xác thực riêng.

Video upload đang bị disable fail-closed trong production. Ảnh được re-encode WebP và loại metadata; video chỉ được mở lại sau khi có worker quarantine/transcode/output verification riêng, không xử lý giả định trong Vercel request path.

Vercel Blob `blob.upload-completed` callback được xác thực bằng chữ ký của SDK, không yêu cầu browser session hoặc same-origin; token payload vẫn chứa actor/class/post và server re-check quyền write trước khi ghi DB. Chỉ nhánh cấp upload token cho browser mới yêu cầu session và same-origin.

## Audit log privacy

Audit chỉ lưu identifiers, action, counters và fingerprint cần cho idempotency. Không lưu token thô, URL media, nội dung note, guardian email (kể cả hash), hoặc full name học sinh trong `afterJson` mới. Các log cũ cần retention/cleanup theo [12-privacy-retention-media.md](./12-privacy-retention-media.md).

## Dependency audit limitation

`npm audit --omit=dev --audit-level=high` pass ở ngưỡng high. Audit vẫn báo 7 moderate transitive advisories đi qua `@neondatabase/auth` beta/better-auth/drizzle-kit/esbuild; `npm audit fix --force` có thể kéo `drizzle-kit` về breaking version nên chưa tự động áp dụng. Cần theo dõi bản phát hành upstream và review/pin dependency trong một maintenance change riêng.
