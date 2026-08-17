# Implementation Guide

## 1. Kiến trúc đề xuất

MVP phù hợp với stack web hiện đại, triển khai nhanh:
- Frontend: Next.js + TypeScript.
- UI: Tailwind CSS + component primitives có accessibility tốt.
- Backend/DB/Auth/Storage: Supabase hoặc PostgreSQL + backend API tương đương.
- Charts: thư viện chart nhẹ, responsive.
- Deployment: Vercel + managed database.

Stack có thể thay đổi; tài liệu chức năng/data model quan trọng hơn framework.

## 2. App structure gợi ý

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
  components/
    classroom/
    scoring/
    gamification/
    praise/
    analytics/
    ui/
  lib/
    auth/
    permissions/
    scoring/
    validation/
  types/
```

## 3. Domain modules

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

## 4. Scoring service

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

## 5. Transaction strategy

Cộng điểm cho nhiều học sinh nên chạy transaction DB hoặc RPC để tránh partial success.

Reward redemption:
1. lock/check spendable balance;
2. tạo redemption;
3. tạo score transaction âm;
4. commit atomically.

## 6. Data fetching

Dashboard nên tải:
- class summary;
- student cards;
- recent activities;
- today tasks.

Không fetch toàn bộ score history khi mở dashboard.

Student detail dùng pagination/infinite timeline.

## 7. Performance target

- Teacher dashboard LCP mục tiêu <2.5s trên mạng phổ thông.
- Quick scoring feedback tức thời; có optimistic UI nhưng rollback khi server lỗi.
- Thumbnail media resize phù hợp.
- Cache các aggregate không nhạy cảm theo lớp/người dùng.

## 8. Forms & validation

- Schema validation dùng Zod hoặc tương đương.
- Không tin dữ liệu client.
- Validate điểm trong range hợp lý.
- Sanitize user-generated text.
- Upload giới hạn file type/size.

## 9. Testing

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

## 10. Seed/demo data

Tạo demo class `Lớp 1/6 — 2026–2027` với dữ liệu giả:
- Mai Anh
- Minh Anh
- Quỳnh Anh
- Gia Hân
- Đức Khoa

Seed behavior templates, 5 levels, 6 badges, 6 rewards và vài transactions để prototype luôn có nội dung.

Không dùng dữ liệu thật của học sinh trong demo public.

## 11. Analytics implementation

Aggregate từ score ledger theo:
- date bucket
- student
- behavior category
- transaction type

Có thể dùng materialized view/job sau khi dữ liệu lớn; MVP có thể query indexed Postgres.

## 12. Future AI module

Chỉ nên thêm sau khi core data ổn định.

Use case phù hợp:
- tóm tắt tiến bộ tuần;
- gợi ý câu tuyên dương;
- gợi ý nhiệm vụ theo dữ liệu thực;
- phát hiện teacher nhập điểm bất thường.

Luôn để teacher phê duyệt nội dung trước khi gửi.
