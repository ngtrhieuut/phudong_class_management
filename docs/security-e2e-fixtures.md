# Authenticated security E2E fixtures

`tests/e2e/authenticated-security.spec.ts` là suite mutation thật qua HTTP/API → service → Neon. Suite không dùng seed production và không được chạy bằng tài khoản giáo viên/phụ huynh thật.

## Environment gate

Chỉ bật repository variable `ENABLE_AUTH_E2E=true` khi đã có một Neon branch/test database riêng, Neon Auth test accounts riêng và toàn bộ secrets được cấu hình trong GitHub Actions. Workflow cố ý fail nếu gate bật nhưng thiếu biến fixture.

Các nhóm fixture cần có:

- connection/auth: `E2E_DATABASE_URL`, `E2E_DATABASE_URL_RUNTIME`, `E2E_NEON_AUTH_BASE_URL`, `E2E_NEON_AUTH_COOKIE_SECRET`;
- accounts: teacher, guardian, admin và một guardian bị revoke/canView=false;
- tenant/class scope: organization A/B, class A/B, student A/B, behavior template và reward;
- guardian scope: child được phép, student ngoài scope, media ngoài scope;
- invitation: token pending hợp lệ, wrong-email, expired, revoked và pending cho concurrent accept;
- atomicity: reward zero-balance và reward fixture chỉ đủ cho một trong hai redemption đồng thời.

Token và password chỉ đặt trong GitHub/Vercel secret store hoặc môi trường test tạm thời; không ghi vào repository, trace công khai hay audit log. Fixture có thể bị thay đổi bởi test nên phải được reset/reseed trước mỗi run. Idempotency keys do test sinh bằng UUID và phải được dọn khỏi fixture database theo chính sách test.

## What is verified

- teacher đúng class và bị từ chối khi đọc/sửa/score/task/reward/praise ngoài class;
- guardian chỉ xem child được link, không lấy foreign media và không xem relation revoked/canView=false;
- teacher không vào admin data; admin bị từ chối khi gửi organization khác;
- invitation accept một lần, wrong-email/expired/revoked bị từ chối, concurrent accept chỉ claim một lần;
- score batch rollback khi có student ngoài class, same-key retry/concurrency/conflict;
- reward retry/conflict, insufficient balance và concurrent overspend.

Khi chưa có fixture, test bị skip có chủ đích và CI phải hiển thị notice. Trạng thái đó không được báo cáo là authenticated security PASS.
