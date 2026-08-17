# Codex MCP / Connector Workflow

Tài liệu này quy định cách Codex kiểm soát dự án bằng **Neon MCP + GitHub Connector + Vercel Connector**.

## 1. Nguyên tắc chung

Codex không được coi prompt hoặc memory là nguồn sự thật cho trạng thái hạ tầng. Khi cần biết trạng thái hiện tại, phải hỏi connector tương ứng:

- Code / docs / commits / PR: GitHub Connector.
- Database / branches / schema / migrations: Neon MCP.
- Deployment / build / runtime errors: Vercel Connector.

Không yêu cầu người dùng thực hiện thao tác thủ công nếu connector hiện có thể thực hiện an toàn.

## 2. GitHub là source of truth

Repo chính:

`ngtrhieuut/phudong_class_management`

Mọi thay đổi architecture, schema, migration và source code phải được phản ánh trong GitHub.

Workflow:
1. đọc file liên quan trước khi sửa;
2. tránh overwrite thay đổi mới hơn;
3. commit theo từng nhóm thay đổi logic;
4. review diff/PR khi task lớn;
5. không commit secret;
6. cập nhật docs cùng feature nếu behavior thay đổi.

## 3. Neon là database platform chính

### Khi project Neon chưa tồn tại

Codex dùng Neon MCP để:
1. kiểm tra các project hiện có;
2. nếu chưa có project phù hợp, tạo project cho `phudong-class-management`;
3. ghi lại project identifier theo cách an toàn trong local/tool context, không commit credential;
4. xác định default branch/database;
5. provision Neon Auth nếu architecture quyết định dùng Neon Auth.

### Schema change

Không chỉnh production schema trực tiếp theo kiểu ad-hoc.

Flow chuẩn:
1. tạo/chuẩn bị migration;
2. thử migration trên temporary/database branch;
3. chạy verification query;
4. chạy tests tương ứng với code;
5. review migration impact;
6. apply vào main database chỉ sau khi đã xác minh;
7. verify sau apply;
8. commit migration trong GitHub.

### Query performance

Nếu query chậm:
1. lấy query/access pattern thật;
2. dùng Neon tooling để xem plan/performance;
3. thử optimization trên branch;
4. đo lại;
5. chỉ giữ optimization có bằng chứng.

Không thêm index hàng loạt theo suy đoán.

## 4. Vercel là deployment platform chính

### Khi Vercel project chưa tồn tại

Codex:
1. kiểm tra project/team qua Vercel Connector;
2. tạo/link/deploy project khi connector hỗ trợ và task yêu cầu;
3. đặt framework/build config phù hợp Next.js;
4. đảm bảo environment variables được cấu hình ở Vercel, không nằm trong GitHub.

### Preview workflow

Với feature lớn:
1. push source lên GitHub;
2. tạo/kiểm tra preview deployment;
3. kiểm tra build status;
4. đọc logs nếu fail;
5. smoke test các route chính;
6. mới tiến tới production khi phù hợp.

### Production verification

Sau production deployment:
- xác minh trạng thái deployment;
- xem runtime errors mới phát sinh;
- kiểm tra login/dashboard/scoring flow;
- kiểm tra database connectivity;
- nếu có migration, verify bằng Neon MCP.

## 5. Environment variable policy

Không commit giá trị thật.

Biến tối thiểu dự kiến:

```env
DATABASE_URL=
DATABASE_URL_UNPOOLED=
NEXT_PUBLIC_APP_URL=
```

Nếu dùng Neon Auth, Codex bổ sung các biến mà Neon cung cấp vào `.env.example` dưới dạng placeholder, rồi cấu hình giá trị thật ở local/Vercel bằng connector hoặc hướng an toàn phù hợp.

## 6. Database branching strategy

Khuyến nghị:

- Neon main/default branch → production database.
- Neon temporary/migration branches → thử schema migration.
- Feature database branch chỉ tạo khi thực sự cần isolation dữ liệu/schema.

Không tạo branch database vô hạn. Sau migration/test hoàn tất phải cleanup branch tạm nếu workflow yêu cầu.

## 7. Project phases cho Codex

### Phase A — Bootstrap
- kiểm tra repo;
- khởi tạo Next.js/TypeScript/Tailwind;
- cấu hình lint/typecheck/tests;
- cấu hình Neon client/ORM;
- tạo `.env.example`;
- tạo health/database connectivity check server-side.

### Phase B — Database foundation
- implement schema từ `docs/04-data-model.md`;
- migrations;
- seed demo;
- auth/roles/permission foundation;
- score ledger + audit.

### Phase C — Teacher MVP
- dashboard;
- student list/detail;
- quick add/subtract score;
- tasks;
- praise;
- rewards/badges.

### Phase D — Parent MVP
- guardian linking;
- parent dashboard;
- child progress;
- praise/notifications.

### Phase E — Analytics & polish
- weekly/monthly analytics;
- mobile PWA polish;
- accessibility;
- performance;
- production hardening.

## 8. Required checkpoints

Codex phải báo rõ sau mỗi milestone:
- GitHub commit/PR trạng thái nào;
- Neon migration/schema trạng thái nào;
- Vercel deployment trạng thái nào;
- tests nào đã chạy;
- blocker hoặc rủi ro còn lại.

Không báo “done” nếu chưa verify phần hạ tầng liên quan bằng connector.

## 9. Failure handling

### Database migration lỗi
- không cố apply production;
- giữ main database nguyên trạng;
- đọc lỗi trên branch thử nghiệm;
- sửa migration;
- test lại.

### Vercel build/deploy lỗi
- đọc build/runtime logs bằng Vercel Connector;
- sửa nguyên nhân thay vì retry mù;
- redeploy và verify.

### Git conflict / source thay đổi ngoài dự kiến
- fetch lại source mới nhất;
- review diff;
- không overwrite thay đổi của người khác một cách im lặng.

## 10. Definition of controlled delivery

Một milestone được xem là kiểm soát đầy đủ khi:
- code đã nằm trong GitHub;
- schema migration đã nằm trong GitHub;
- database đã được verify qua Neon khi có DB change;
- deployment đã được verify qua Vercel khi có deploy;
- không có secret trong repo;
- tests phù hợp đã pass;
- docs phản ánh architecture hiện tại.
