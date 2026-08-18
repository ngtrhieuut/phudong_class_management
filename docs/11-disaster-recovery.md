# Migration, backup và recovery runbook

## Phạm vi hiện tại

- Neon main branch: `br-small-dew-afcozbtg`.
- Các branch Neon được dùng để kiểm thử migration/recovery, không dùng làm production endpoint.
- Live Neon project đã xác minh có point-in-time history retention khoảng 6 giờ trong cấu hình hiện tại. Đây là cửa sổ khôi phục đã quan sát được, không phải cam kết backup dài hạn.
- Vercel deployment có thể rollback về deployment `READY` trước đó; luôn ghi lại commit SHA và deployment ID trong release note.

## Trước mỗi migration

1. Kiểm tra `git status`, migration journal, `npm run db:check` và `npm run db:verify` bằng runtime/recovery connection phù hợp.
2. Tạo Neon branch từ main làm rehearsal; chạy migration trên branch đó bằng connection string riêng.
3. Chạy `npm run typecheck`, unit/integration tests, `npm run build`, sau đó smoke-test health/auth/teacher/parent/admin.
4. Ghi lại branch ID, migration file, schema diff và query kiểm tra invariants.
5. Chỉ áp dụng main sau approval production; migration phải additive hoặc có rollback rõ ràng, không dùng `DROP`/hard-delete trong cùng release.

## Roll-forward / rollback

- Migration Drizzle là source of truth; không sửa migration đã chạy. Migration mới dùng cho corrective change.
- Nếu deploy fail nhưng schema tương thích: rollback Vercel về deployment trước, giữ migration.
- Nếu migration fail giữa chừng: dừng deploy, đọc lỗi và kiểm tra transaction state; không chạy lặp thủ công bằng SQL khác với migration.
- Nếu cần restore: tạo branch mới tại timestamp trước lỗi, xác minh schema/data invariants trên branch, rồi quyết định restore dữ liệu có kiểm soát. Không overwrite main trong khi chưa có approval.

## Restore drill

Migration-journal rehearsal ngày 2026-08-18 trên branch tạm `br-quiet-meadow-afkk2sia` đã tạo `drizzle.__drizzle_migrations`, ghi 3 SHA-256/timestamp khớp `_journal.json`, chạy `REQUIRE_MIGRATION_JOURNAL=true npm run db:drift` thành công và sau đó được xoá.

Mỗi release lớn cần ghi lại một drill trên branch:

1. tạo branch từ main;
2. chạy migration hiện tại;
3. kiểm tra số bảng, constraints, indexes, tenant counts và một số invariants (`score snapshot >= 0`, class/student FK, guardian scope);
4. thực hiện `npm run build` với connection string branch;
5. xóa branch thử nghiệm sau khi lưu kết quả.

## Release evidence

Release note tối thiểu gồm: commit SHA, Vercel deployment ID/URL/state, Neon branch/main đã kiểm tra, migration applied hoặc `not applied`, test commands và blocker. Không ghi connection string, token, PII hay password vào repository/log.
