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

## Evidence đã chạy ngày 2026-08-18

- Neon main `br-small-dew-afcozbtg`: 28 public tables, 0 policy, 0 bảng bật RLS; `phudong_runtime` đã pass least-privilege verification; invariant read-only cho avatar/orphan class-student/orphan student link/negative snapshot đều bằng 0.
- Rehearsal branch `br-empty-scene-afpgv9al`: 28 public tables, 1 policy và 1 bảng RLS do test role/policy rehearsal. Schema diff chỉ phản ánh rehearsal role/grants/policy; không áp dụng vào main.
- Restore/invariant rehearsal trên `br-empty-scene-afpgv9al` trả 0 orphan class-student, 0 orphan student link và 0 negative score snapshot; schema diff đã được Neon MCP đọc lại và không có SQL nào chạy trên main.
- `npm run db:check` kiểm tra migration files; `npm run db:verify` và `npm run db:verify-runtime` là contract/privilege checks read-only với runtime role. `npm run db:drift` đã pass strict trên main sau khi khôi phục journal với 3 entry khớp hash/timestamp; CI chỉ bật live check qua `ENABLE_DB_VERIFY=true` và connection phù hợp.
