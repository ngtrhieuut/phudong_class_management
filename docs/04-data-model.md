# Data Model đề xuất

## 1. Nguyên tắc

- Multi-tenant theo `school_id` hoặc `organization_id` để có thể mở rộng nhiều lớp/trường.
- Mọi dữ liệu học sinh gắn với lớp và năm học.
- Điểm là ledger bất biến, không lưu duy nhất bằng một cột tổng có thể sửa tùy ý.
- File/media lưu object storage; DB chỉ lưu metadata/URL.
- Dùng UUID cho public identifier.

## 2. Core entities

### users
- id
- email / phone
- display_name
- avatar_url
- status
- created_at / updated_at

### organizations
- id
- name
- code
- settings_json

### organization_members
- organization_id
- user_id
- role: admin / teacher / staff

### school_years
- id
- organization_id
- name: `2026-2027`
- starts_at / ends_at
- active

### classes
- id
- organization_id
- school_year_id
- name: `Lớp 1/6`
- grade
- homeroom_teacher_id
- cover_url
- settings_json

### class_memberships
Dùng cho giáo viên phụ trách nhiều lớp.
- class_id
- user_id
- role

### students
- id
- organization_id
- student_code
- full_name
- short_name
- birth_date
- gender nullable
- avatar_url
- status

### class_students
- class_id
- student_id
- seat_no nullable
- group_name nullable
- class_role_id nullable
- joined_at
- left_at nullable

### guardians
- id
- user_id nullable
- full_name
- phone/email

### student_guardians
- student_id
- guardian_id
- relationship
- can_view
- receives_notifications

## 3. Class roles

### class_roles
- id
- class_id
- name
- icon
- description
- sort_order

## 4. Behavior & score ledger

### behavior_templates
- id
- organization_id nullable
- class_id nullable
- name
- category: positive / needs_improvement
- default_points
- icon
- color_token
- parent_visibility
- daily_limit nullable
- active

### score_transactions
- id
- class_id
- student_id
- behavior_template_id nullable
- actor_user_id
- transaction_type: behavior / task / badge / reward / adjustment / manual
- lifetime_delta
- spendable_delta
- reason
- note nullable
- source_transaction_id nullable
- occurred_at
- created_at

`source_transaction_id` dùng cho giao dịch điều chỉnh/đảo giao dịch.

### student_score_snapshots (optional cache)
- student_id
- class_id
- lifetime_score
- spendable_stars
- updated_at

Snapshot chỉ để tăng tốc; ledger là source of truth.

## 5. Levels

### level_definitions
- id
- class_id nullable
- name
- min_score
- max_score nullable
- image_url
- sort_order

Có thể resolve current level từ lifetime score.

## 6. Badges

### badge_definitions
- id
- class_id nullable
- name
- description
- icon_url
- rule_json nullable
- active

### student_badges
- id
- student_id
- class_id
- badge_id
- awarded_by nullable
- awarded_at
- reason nullable

## 7. Tasks

### tasks
- id
- class_id
- title
- description
- scope: student / group / class
- reward_stars
- completion_mode
- starts_at
- due_at
- status
- created_by

### task_assignments
- id
- task_id
- student_id
- status
- completed_at nullable
- approved_by nullable

## 8. Rewards

### rewards
- id
- class_id
- name
- description
- image_url
- reward_type
- cost_stars
- stock nullable
- active

### reward_redemptions
- id
- reward_id
- student_id
- class_id
- cost_stars
- status: requested / approved / fulfilled / rejected / cancelled
- requested_at
- approved_by nullable
- fulfilled_at nullable

## 9. Praise feed

### praise_posts
- id
- class_id
- author_user_id
- title
- body
- visibility: class / related_guardians / teacher_only
- created_at
- updated_at

### praise_post_students
- post_id
- student_id

### media_assets
- id
- owner_type
- owner_id
- storage_key
- mime_type
- width/height/duration nullable
- created_at

## 10. Notes & messages

### teacher_notes
- id
- student_id
- class_id
- author_user_id
- body
- visibility: teacher_only / guardian_visible
- created_at

## 11. Notifications

### notifications
- id
- user_id
- type
- title
- body
- deep_link
- read_at nullable
- created_at

## 12. Audit log

### audit_logs
- id
- organization_id
- actor_user_id
- entity_type
- entity_id
- action
- before_json nullable
- after_json nullable
- ip_hash nullable
- created_at

## 13. Index quan trọng

- `score_transactions(class_id, student_id, occurred_at desc)`
- `score_transactions(class_id, behavior_template_id, occurred_at desc)`
- `task_assignments(student_id, status)`
- `student_badges(student_id, awarded_at desc)`
- `praise_posts(class_id, created_at desc)`
- `notifications(user_id, read_at, created_at desc)`

## 14. RLS / authorization gợi ý

Nếu dùng Supabase/Postgres:
- Teacher chỉ thao tác lớp mà mình là member.
- Guardian chỉ SELECT student có relation trong `student_guardians`.
- Student chỉ SELECT profile của bản thân.
- Admin scope theo organization.
- Media URL private dùng signed URL thay vì bucket public.
