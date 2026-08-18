# Disaster recovery và restore runbook

## Release checklist

1. Ghi commit SHA, `git status`, migration journal và kết quả `npm run db:check`.
2. Tạo Neon branch từ main để rehearsal; không chạy destructive SQL trên main trong bước thử.
3. Chạy typecheck, lint, unit/E2E tests, build và smoke test health/auth/teacher/parent/admin.
4. So sánh schema, kiểm tra FK/constraint/index, score snapshot không âm, class/student tenant consistency và guardian scope.
5. Chỉ áp dụng main migration sau approval production; migration phải additive hoặc có rollback rõ ràng.

## Current live evidence

- Neon main: `br-small-dew-afcozbtg`; branch rehearsal: `br-empty-scene-afpgv9al`.
- Point-in-time history khoảng 6 giờ đã được quan sát trong cấu hình hiện tại; đây không phải cam kết backup dài hạn.
- Vercel có thể rollback deployment `READY` trước đó theo deployment ID/commit SHA.

## Recovery choices

- Code/deploy lỗi nhưng schema tương thích: rollback Vercel về deployment trước, giữ migration.
- Migration lỗi: dừng rollout, kiểm tra transaction/schema state và tạo corrective migration; không sửa migration đã chạy.
- Data corruption: tạo branch tại timestamp trước lỗi, xác minh invariants trên branch, export/restore có kiểm soát sau approval; không overwrite main khi chưa có backup/evidence.

Mỗi restore drill phải lưu branch ID, timestamp, schema diff, invariant results, test/build output và quyết định cleanup. Không lưu connection string, token, password hoặc PII trong repository/log.
