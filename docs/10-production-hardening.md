# Production hardening baseline

Ngày kiểm tra live: 2026-08-18 (Asia/Ho_Chi_Minh).

## Neon baseline đã xác minh

- Project: `shiny-field-99523851`; branch chính: `br-small-dew-afcozbtg` (`main`); database: `neondb`.
- PostgreSQL: `18.4 (c9a59a4)`.
- Runtime hiện kết nối bằng role `neondb_owner`.
- `neondb_owner` có `CREATEROLE`, `CREATEDB` và `BYPASSRLS`; đây không phải least privilege.
- 28 bảng trong `public` hiện chưa bật RLS và chưa có policy. Không được bật RLS trực tiếp trên `main` cho đến khi toàn bộ request path đã có policy tương ứng.
- Public schema và các bảng public đang thuộc owner `neondb_owner`; chưa có application runtime role riêng.

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

## Audit log privacy

Audit chỉ lưu identifiers, action, counters và fingerprint cần cho idempotency. Không lưu token thô, URL media, nội dung note, hoặc email guardian trong `afterJson` mới. Các log cũ cần retention/cleanup theo [12-privacy-retention-media.md](./12-privacy-retention-media.md).
