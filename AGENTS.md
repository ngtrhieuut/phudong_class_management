# AGENTS.md

Hướng dẫn bắt buộc dành cho Codex/AI coding agent phát triển repo này.

## Product intent

Xây dựng web/PWA **Ngôi Sao Lớp Học / Phù Đổng Class Management** cho giáo viên tiểu học, tập trung vào quản lý lớp, động viên, tuyên dương, nhiệm vụ, gamification và phụ huynh theo dõi.

Nguồn yêu cầu chính nằm trong `README.md` và thư mục `docs/`. Không tự ý thay đổi triết lý sản phẩm nếu chưa có yêu cầu mới.

## Selected production stack

Stack mặc định của dự án đã được chốt:

- Framework: Next.js + TypeScript, ưu tiên App Router.
- UI: Tailwind CSS + accessible component primitives.
- Database: **Neon PostgreSQL**.
- ORM/query layer: Drizzle ORM ưu tiên; có thể dùng SQL trực tiếp cho migration hoặc transaction nhạy cảm.
- Authentication: ưu tiên **Neon Auth** nếu phù hợp với phiên bản stack hiện tại; nếu có blocker thực tế mới chuyển sang Auth.js và ghi rõ lý do trong docs.
- Validation: Zod.
- Deployment: **Vercel**.
- Source control: **GitHub** repo này.
- Testing: Vitest hoặc tương đương cho unit/integration; Playwright cho E2E.

Không đưa Supabase/Firebase vào runtime architecture trừ khi có yêu cầu mới.

## Mandatory connected tools

Codex phải ưu tiên sử dụng các connector/MCP đã được cấp thay vì yêu cầu người dùng thao tác thủ công khi tool có thể làm được.

### Neon MCP

Sử dụng Neon MCP cho:
- khám phá hoặc tạo Neon project khi cần;
- kiểm tra project/branch/database hiện tại;
- tạo database branch cho thay đổi schema lớn;
- chuẩn bị và kiểm tra migration trước khi áp dụng vào main database;
- chạy query kiểm tra schema/data khi cần;
- kiểm tra performance và query plan khi có bottleneck;
- provisioning Neon Auth khi quyết định dùng Neon Auth.

Không tự tạo database provider khác để thay thế Neon.

### GitHub Connector

Sử dụng GitHub Connector cho:
- đọc repo trước khi thay đổi;
- tạo/update file;
- kiểm tra commit/branch/PR;
- review diff trước khi merge;
- theo dõi thay đổi tài liệu và source code.

GitHub là source of truth của code và tài liệu.

### Vercel Connector

Sử dụng Vercel Connector cho:
- kiểm tra project/deployment hiện tại;
- triển khai preview/production khi phù hợp;
- đọc build logs/runtime logs;
- điều tra lỗi production;
- xác minh deployment sau thay đổi quan trọng.

Không coi deploy thành công chỉ vì build local pass; khi đã có Vercel project, phải kiểm tra trạng thái deployment bằng connector.

## Tool workflow bắt buộc

Trước mỗi task lớn:
1. Đọc `README.md`, `AGENTS.md` và docs liên quan.
2. Dùng GitHub Connector kiểm tra trạng thái repo/code hiện có.
3. Nếu task liên quan database, dùng Neon MCP kiểm tra project/branch/schema trước khi viết migration.
4. Lập plan ngắn theo milestone.
5. Thực hiện thay đổi nhỏ, có thể review.
6. Chạy lint/typecheck/test/build phù hợp.
7. Dùng GitHub Connector kiểm tra thay đổi/commit.
8. Nếu có deployment, dùng Vercel Connector kiểm tra deployment và logs.
9. Nếu có migration production, dùng quy trình branch/test/verify của Neon trước khi áp dụng.

Không đoán trạng thái của Neon, GitHub hoặc Vercel nếu có connector để kiểm tra trực tiếp.

## Environment & secrets

- Không commit `.env`, connection string, password, token, secret hoặc credential thật.
- Chỉ commit `.env.example` với tên biến và placeholder an toàn.
- Production secrets phải cấu hình trong Vercel Environment Variables.
- Local secrets nằm trong `.env.local` và phải được gitignore.
- Database URL production không được log ra console hoặc gửi vào client bundle.
- Chỉ code server-side được quyền truy cập `DATABASE_URL`.

Các biến dự kiến:
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` nếu migration/tooling cần direct connection
- các biến Neon Auth tương ứng nếu Neon Auth được provision
- `NEXT_PUBLIC_APP_URL`

## Database rules

- Neon PostgreSQL là source of truth cho dữ liệu ứng dụng.
- Dùng UUID hoặc identifier ổn định cho entity chính.
- Mọi bảng nghiệp vụ cần timestamps phù hợp.
- Không hard-delete score transaction/audit record.
- Không để client tự update tổng điểm.
- Mọi thay đổi điểm phải có actor, timestamp và reason/source.
- Multi-student scoring phải atomic.
- Reward redemption phải atomic và không thể overspend.
- Migration phải nằm trong source control.
- Không sửa production schema thủ công mà không cập nhật migration tương ứng trong repo.

## Data privacy & authorization

Priority order:
1. Data privacy & permissions.
2. Score ledger integrity.
3. Teacher quick actions.
4. Mobile parent experience.
5. Gamification.
6. Visual polish.

Quy tắc không được phá vỡ:
- Guardian chỉ xem dữ liệu của con mình.
- Teacher chỉ thao tác trên lớp/học sinh thuộc phạm vi được phân quyền.
- Authorization phải kiểm tra server-side.
- Không public ảnh/video học sinh mặc định.
- Không tạo leaderboard công khai mặc định.
- Không dùng dữ liệu học sinh thật trong seed/demo public.
- Không thêm loot box/cơ chế may rủi.

## Working method

Khi task lớn, spawn subagents khi cần nhưng chia domain rõ ràng, ví dụ:
- database/schema/security;
- authentication/authorization;
- teacher dashboard;
- gamification;
- parent portal;
- testing/review;
- deployment/observability.

Một agent chính chịu trách nhiệm integration review. Tránh để nhiều subagent sửa cùng file/schema cùng lúc.

## UI principles

- Mobile-first và responsive từ đầu.
- Teacher flow: ít click, ít text input, phản hồi ngay.
- Parent flow: mobile-first, timeline rõ.
- Phù hợp trẻ lớp 1–5: vui tươi, pastel, icon/mascot thân thiện nhưng tinh gọn.
- Dùng nhiều icon có label để tăng khả năng nhận diện.
- Không hy sinh readability để trang trí.
- Touch target tối thiểu 44px.
- Không dùng màu làm tín hiệu duy nhất cho positive/negative.

## Domain boundaries

Tách business logic khỏi component UI:
- classroom
- students
- behaviors
- scoring
- levels
- badges
- tasks
- rewards
- praise
- guardians
- analytics
- audit

## Testing requirements

Mọi thay đổi quan trọng cho scoring/permissions/database phải có test phù hợp.

Tối thiểu cover:
- teacher thao tác đúng lớp;
- teacher không thao tác lớp không thuộc quyền;
- guardian chỉ xem con mình;
- score adjustment giữ lịch sử;
- reward redemption không overspend;
- multi-student scoring không partial update;
- unauthorized API/database action bị từ chối;
- migration không làm mất dữ liệu dự kiến.

## Deployment gates

Trước production deployment:
- lint pass;
- typecheck pass;
- tests quan trọng pass;
- production build pass;
- không có secret bị commit;
- schema/migration tương thích;
- preview deployment được kiểm tra khi có thể.

Sau deployment:
- dùng Vercel Connector kiểm tra deployment status;
- kiểm tra runtime/build errors;
- smoke test flow chính;
- nếu có database migration, verify schema và các query quan trọng bằng Neon MCP.

## Definition of done

Feature chỉ hoàn thành khi:
- business rule đúng tài liệu;
- authorization server-side;
- database changes có migration và được verify;
- empty/loading/error/success states;
- responsive mobile + desktop;
- accessibility cơ bản;
- test cho logic nhạy cảm;
- không lộ secret/PII;
- GitHub đã phản ánh source of truth mới;
- Vercel deployment được verify nếu feature đã deploy;
- docs được cập nhật nếu behavior/architecture thay đổi.

## Commit style

Dùng commit ngắn, rõ:
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`
- `chore: ...`

Không gom các thay đổi không liên quan vào một commit lớn.
