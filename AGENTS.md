# AGENTS.md

Hướng dẫn dành cho Codex/AI coding agent phát triển repo này.

## Product intent

Xây dựng web/PWA **Ngôi Sao Lớp Học / Phù Đổng Class Management** cho giáo viên tiểu học, tập trung vào quản lý lớp, động viên, tuyên dương, nhiệm vụ, gamification và phụ huynh theo dõi.

Nguồn yêu cầu chính nằm trong thư mục `docs/`. Không tự ý đổi triết lý sản phẩm nếu chưa có yêu cầu mới.

## Priority order

1. Data privacy & permissions.
2. Score ledger integrity.
3. Teacher quick actions.
4. Mobile parent experience.
5. Gamification.
6. Visual polish.

## Non-negotiable rules

- Không hard-delete score transaction.
- Không để client tự update tổng điểm.
- Mọi thay đổi điểm phải có actor, timestamp và reason/source.
- Guardian chỉ được xem dữ liệu của con mình.
- Không public ảnh/video học sinh mặc định.
- Không tạo leaderboard công khai mặc định.
- Không thêm cơ chế may rủi/loot box.
- Không dùng dữ liệu học sinh thật trong seed/demo public.

## Recommended stack

Nếu repo chưa có code, ưu tiên:
- Next.js + TypeScript
- Tailwind CSS
- Supabase/PostgreSQL/Auth/Storage
- Zod validation
- Playwright E2E

Có thể chọn stack tương đương nếu có lý do rõ ràng.

## Working method

Trước khi code:
1. Đọc `README.md`.
2. Đọc toàn bộ `docs/01` → `docs/08` liên quan task.
3. Kiểm tra code hiện có trước khi thêm abstraction mới.
4. Lập plan ngắn theo milestone.

Khi task lớn, spawn subagents khi cần nhưng chia theo domain rõ ràng, ví dụ:
- schema/security
- teacher dashboard
- gamification
- parent portal
- testing/review

Một agent chính phải review integration trước khi merge.

## UI principles

- Teacher flow: ít click, ít text input, phản hồi ngay.
- Parent flow: mobile-first, timeline rõ.
- Trẻ em: vui tươi, pastel, icon/mascot thân thiện.
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

Mọi thay đổi quan trọng cho scoring/permissions cần test.

Tối thiểu cover:
- teacher thao tác đúng lớp;
- teacher không thao tác lớp không thuộc quyền;
- guardian chỉ xem con mình;
- score adjustment giữ lịch sử;
- reward redemption không thể overspend;
- multi-student scoring không partial update.

## Definition of done

Một feature chỉ hoàn thành khi:
- business rule đúng tài liệu;
- authorization server-side;
- empty/loading/error state;
- responsive;
- keyboard/basic accessibility nếu relevant;
- test cho logic nhạy cảm;
- không lộ secret/PII;
- cập nhật docs nếu behavior thay đổi.

## Commit style

Dùng commit ngắn, rõ:
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`

Không gom các thay đổi không liên quan vào một commit lớn.
