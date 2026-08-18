# Production hardening baseline

Ngày kiểm tra live: 2026-08-18 (Asia/Ho_Chi_Minh).

## Neon/Vercel hiện trạng

- Project `shiny-field-99523851`; main branch `br-small-dew-afcozbtg`; database `neondb`; PostgreSQL 18.4.
- Main có 28 bảng public, 0 bảng bật RLS và 0 policy.
- `neondb_owner` là migration/recovery role, có `CREATEROLE`, `CREATEDB`, `BYPASSRLS`; không dùng role này làm application runtime.
- `phudong_runtime` đã được tạo với `SUPERUSER/CREATEROLE/CREATEDB/BYPASSRLS=false`, connection limit 10, không có `CREATE` schema hoặc destructive table privilege; runtime verification pass.
- `drizzle.__drizzle_migrations` đã được khôi phục trên main. Strict drift verification khớp 3 migration entry và schema parity 28/28.
- Vercel Production có `DATABASE_URL_RUNTIME` và `REQUIRE_RUNTIME_ROLE=true` encrypted. Preview không được nối vào database production.

Kết luận: runtime least privilege đã hoạt động; tenant isolation database-level vẫn chưa hoàn tất vì RLS chưa bật.

## Rollout đã thực hiện

1. Rehearsal trên branch Neon tạm với role, grants, journal và runtime verification.
2. Áp dụng role/grants additive trên main.
3. Khôi phục migration journal additive, không đụng dữ liệu nghiệp vụ.
4. Cấu hình Production env encrypted và deploy `dpl_EGYDhHXtesxCPCzpbu7zph3B8uby` ở trạng thái `READY`.
5. Production `/api/health/db` trả `200`; Vercel runtime error scan trong 1 giờ đầu không có lỗi.

## RLS status

RLS **chưa bật trên main**. Application hiện chưa có request-scoped database context bắt buộc cho mọi query authenticated. Nhiều service dùng global Drizzle proxy hoặc mở transaction riêng; nếu bật policy dựa trên `current_setting('app.user_id', true)` ngay bây giờ, các đường query chưa set context sẽ bị deny không có chủ đích.

Không dùng policy tạm, `BYPASSRLS`, hoặc quyền owner để che blocker. Thay vào đó, runtime least privilege đã được triển khai ngay và app-layer authorization tiếp tục là boundary chính.

## Điều kiện cho Phase RLS tiếp theo

- Tạo wrapper transaction request-context và truyền transaction object xuống tất cả service/query authenticated.
- Dùng `set_config(..., true)` với user/organization context lấy từ session server-side, không lấy từ client payload.
- Thêm static check không cho authenticated route gọi global `db` ngoài wrapper.
- Test branch với runtime role cho CRUD, cross-tenant denial, guardian scope, invitation flow, score/reward atomicity và rollback.
- Bật policy theo dependency order; chỉ dùng `FORCE ROW LEVEL SECURITY` sau khi integration pass.

## Authenticated integration gate

`tests/e2e/authenticated-security.spec.ts` bao phủ teacher/guardian/admin isolation, invitation replay/concurrency và score/reward atomicity. CI chỉ chạy khi `ENABLE_AUTH_E2E=true` và fixture secrets riêng đã cấu hình; job skip không được diễn giải là authenticated PASS. Lần chạy fixture branch ngày 2026-08-18 đã pass Chromium 13/13, không dùng dữ liệu production.

## Các giới hạn còn lại

- `npm audit --omit=dev --audit-level=high` pass ở ngưỡng high; còn 7 moderate transitive advisories qua Neon Auth/better-auth/drizzle-kit/esbuild.
- Video production vẫn fail-closed cho đến khi có pipeline quarantine/transcode/metadata stripping được kiểm chứng.
- Preview chưa có DB env riêng; khi mở preview database cần provision database/branch runtime riêng, không tái sử dụng Production URL.
