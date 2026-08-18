# Privacy và phân loại dữ liệu

## Phân loại

| Nhóm | Ví dụ | Quyền truy cập | Nguyên tắc lưu giữ |
| --- | --- | --- | --- |
| PII học sinh | họ tên, mã, ngày sinh, giới tính, avatar, lớp, chỗ ngồi | teacher trong class; admin trong organization | giữ theo chính sách nhà trường/năm học |
| PII guardian | tên, email, phone, quan hệ, can-view | teacher có class access; guardian chỉ quan hệ của mình | không đưa vào log không cần thiết |
| Dữ liệu giáo dục | điểm, hành vi, task, badge, praise, ghi chú | teacher/admin; guardian theo visibility và child link | không hard-delete lịch sử điểm |
| Bí mật hệ thống | session, token, Blob token, connection string | server/secret store | không lưu vào audit, CSV hoặc client log |

## Quy tắc xử lý

- Mọi query phải kiểm tra tenant/class/student relation ở server; không tin `organizationId`, `classId` hay role do client gửi.
- Invitation chỉ lưu hash token; token hết hạn/revoked không dùng lại.
- Media praise lưu private; ảnh được server re-encode WebP và loại metadata nguồn. Video mới chỉ được kiểm tra container signature/size, chưa tuyên bố metadata stripping.
- Export phải có audit và bảo vệ CSV formula injection; không đưa secret hoặc dữ liệu ngoài phạm vi vào file.
- Retention period cụ thể phải được nhà trường phê duyệt. Khi có policy, chạy deletion/archive job theo organization, cleanup object storage và chỉ ghi aggregate result.
