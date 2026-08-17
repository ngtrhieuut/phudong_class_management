# Implementation Guide

## 1. Kiến trúc đã chốt

MVP sử dụng stack sau:
- Frontend: Next.js + TypeScript, ưu tiên App Router.
- UI: Tailwind CSS + accessible component primitives.
- Database: **Neon PostgreSQL**.
- ORM/query layer: ưu tiên Drizzle ORM; SQL trực tiếp được phép cho migration/transaction nhạy cảm.
- Authentication: ưu tiên **Neon Auth** nếu phù hợp với phiên bản stack hiện tại; fallback Auth.js nếu có blocker thực tế và phải ghi rõ lý do.
- Validation: Zod.
- Charts: thư viện chart nhẹ, responsive.
- Deployment: **Vercel**.
- Source control: **GitHub**.
- Testing: Vitest hoặc tương đương + Playwright E2E.

Không dùng Supabase/Firebase trong runtime architecture trừ khi có quyết định mới.

## 2. Kiến trúc hệ thống

```text
Mobile / Desktop Browser
          │
          ▼
   Next.js on Vercel
          │
   ┌──────┼──────────────┐
   │      │              │
   ▼      ▼              ▼
Server  Auth layer   Static/media layer
Actions / API        (provider chọn riêng nếu cần)
   │      │
   └──┬───┘
      ▼
 Neon PostgreSQL
      │
      ├── classrooms
      ├── students
      ├── guardians
      ├── score_transactions
      ├── tasks
      ├── badges
      ├── rewards
      ├── praise_posts
      ├── notifications
      └── audit_logs
```

`DATABASE_URL` chỉ được truy cập server-side.

## 3. Connected-tool architecture

Codex phải sử dụng các connector/MCP được cấp như lớp điều khiển dự án:

### Neon MCP
- khám phá/tạo project;
- kiểm tra branch/database/schema;
- tạo branch để thử migration;
- verify migration trước khi áp dụng production;
- kiểm tra query/schema sau migration;
- tuning query khi cần;
- provision Neon Auth nếu chọn Neon Auth.

### GitHub Connector
- đọc source hiện tại trước khi sửa;
- cập nhật source/docs;
- kiểm tra commit/branch/PR/diff;
- duy trì GitHub là source of truth.

### Vercel Connector
- khám phá project/deployment;
- deploy khi phù hợp;
- đọc build/runtime logs;
- xác minh preview/production deployment;
- điều tra production error.

Chi tiết workflow nằm ở `docs/09-codex-mcp-workflow.md`.

## 4. App structure gợi ý

```text
src/
  app/
    (auth)/
    teacher/
      dashboard/
      students/
      tasks/
      praise/
      analytics/
      settings/
    parent/
      today/
      progress/
      badges/
      praise/
    admin/
    api/
  components/
    classroom/
    scoring/
    gamification/
    praise/
    analytics/
    ui/
  db/
    schema/
    migrations/
    queries/
  lib/
    auth/
    permissions/
    scoring/
    validation/
  types/
```

## 5. Database access pattern

Ưu tiên:
- server components/server actions cho read/write phù hợp;
- API routes khi cần endpoint rõ ràng;
- không truy cập Neon trực tiếp từ browser bằng credential privileged;
- dùng repository/query functions theo domain;
- mọi write nhạy cảm phải validate authorization server-side.

## 6. Domain modules

Tách logic theo domain, không đặt business logic trực tiếp trong UI:
- classroom
- students
- scoring
- behaviors
- levels
- badges
- tasks
- rewards
- praise
- guardians
- analytics
- audit

## 7. Scoring service

Một entry point chuẩn cho thay đổi điểm:

```ts
recordScoreTransaction({
  classId,
  studentIds,
  actorUserId,
  behaviorTemplateId,
  lifetimeDelta,
  spendableDelta,
  reason,
})
```

Service phải:
- validate permission;
- validate student thuộc lớp;
- enforce limits;
- insert ledger transaction;
- update/cache totals atomically;
- trigger badge/task checks nếu bật;
- ghi audit log khi cần.

Không update trực tiếp `student.total_points` từ client.

## 8. Transaction strategy

Cộng điểm cho nhiều học sinh phải chạy atomic transaction để tránh partial success.

Reward redemption:
1. lock/check spendable balance;
2. tạo redemption;
3. tạo score transaction âm;
4. commit atomically.

Score ledger và audit log không hard-delete.

## 9. Migration strategy trên Neon

Mọi schema change phải:
1. được biểu diễn thành migration trong repo;
2. được kiểm tra trên Neon branch/temporary migration branch trước;
3. chạy query verify;
4. chỉ sau khi pass mới áp dụng vào production/main database;
5. verify lại schema/query sau khi áp dụng.

Không sửa schema production thủ công rồi bỏ qua migration source-control.

## 10. Environment variables

Dùng `.env.example` làm template. Không commit secret thật.

Các biến dự kiến:
- `DATABASE_URL` — pooled/server runtime URL.
- `DATABASE_URL_UNPOOLED` — direct URL nếu migration/tooling cần.
- `NEXT_PUBLIC_APP_URL`.
- Neon Auth variables nếu Neon Auth được provision.

Local dùng `.env.local`. Production/Preview variables cấu hình trên Vercel.

## 11. Data fetching

Dashboard nên tải:
- class summary;
- student cards;
- recent activities;
- today tasks.

Không fetch toàn bộ score history khi mở dashboard.

Student detail dùng pagination/infinite timeline.

## 12. Performance target

- Teacher dashboard LCP mục tiêu <2.5s trên mạng phổ thông.
- Quick scoring feedback tức thời; có optimistic UI nhưng rollback khi server lỗi.
- Thumbnail media resize phù hợp.
- Query phải có index theo access pattern thực tế.
- Khi chậm, dùng Neon MCP/query plan trước khi thêm index theo phỏng đoán.

## 13. Forms & validation

- Schema validation dùng Zod hoặc tương đương.
- Không tin dữ liệu client.
- Validate điểm trong range hợp lý.
- Sanitize user-generated text.
- Upload giới hạn file type/size.

## 14. Testing

### Unit
- score calculation
- level resolution
- reward balance
- permission helpers

### Integration
- teacher can score own class
- teacher cannot score foreign class
- guardian can view own child only
- adjustment preserves audit trail
- reward redemption atomic

### E2E
- login → dashboard → score student
- create task → complete task
- publish praise post
- guardian opens daily summary

## 15. Deployment workflow

Trước deploy:
- lint;
- typecheck;
- tests;
- production build;
- kiểm tra migration compatibility;
- secret scan cơ bản.

Sau deploy:
- dùng Vercel Connector kiểm tra trạng thái;
- kiểm tra build/runtime logs;
- smoke test flow quan trọng;
- nếu có migration, dùng Neon MCP verify lại database.

## 16. Seed/demo data

Tạo demo class `Lớp 1/6 — 2026–2027` với dữ liệu giả:
- Mai Anh
- Minh Anh
- Quỳnh Anh
- Gia Hân
- Đức Khoa

Seed behavior templates, 5 levels, 6 badges, 6 rewards và vài transactions để prototype luôn có nội dung.

Không dùng dữ liệu thật của học sinh trong demo public.

## 17. Analytics implementation

Aggregate từ score ledger theo:
- date bucket
- student
- behavior category
- transaction type

MVP query PostgreSQL indexed. Khi dữ liệu lớn hơn có thể dùng materialized views/background jobs.

## 18. Future AI module

Chỉ thêm sau khi core data ổn định.

Use case phù hợp:
- tóm tắt tiến bộ tuần;
- gợi ý câu tuyên dương;
- gợi ý nhiệm vụ theo dữ liệu thực;
- phát hiện teacher nhập điểm bất thường.

Luôn để teacher phê duyệt nội dung trước khi gửi.
