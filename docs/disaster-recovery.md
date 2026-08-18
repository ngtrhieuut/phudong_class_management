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

- Neon main `br-small-dew-afcozbtg`: 28 public tables, 0 policy, 0 bảng bật RLS; invariant read-only cho avatar/orphan class-student/orphan student link/negative snapshot đều bằng 0.
- Rehearsal branch `br-empty-scene-afpgv9al`: 28 public tables, 1 policy và 1 bảng RLS do test role/policy rehearsal. Schema diff chỉ phản ánh rehearsal role/grants/policy; không áp dụng vào main.
- Release `e3ab1e2` và hardening commit `88c6a3d` không có database migration mới. `npm run db:check` kiểm tra migration files; `npm run db:verify` là contract check read-only với schema live và fail nếu thiếu bảng/cột/index quan trọng. CI chỉ bật live check qua `ENABLE_DB_VERIFY=true` và runtime connection riêng.
