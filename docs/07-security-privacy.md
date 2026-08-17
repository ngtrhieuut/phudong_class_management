# Security & Privacy

## 1. Nguyên tắc

Dữ liệu học sinh là dữ liệu cần bảo vệ cao. Hệ thống phải áp dụng privacy-by-design ngay từ MVP.

## 2. Authorization

- Teacher chỉ truy cập lớp mình phụ trách.
- Guardian chỉ truy cập học sinh đã được liên kết hợp lệ.
- Student chỉ xem hồ sơ của bản thân nếu có account.
- Admin chỉ thao tác trong organization của mình.
- API không tin cậy role/IDs do client gửi; luôn kiểm tra server-side.

## 3. Score integrity

- Không hard-delete score transaction.
- Mọi sửa sai dùng adjustment transaction.
- Lưu actor, timestamp, reason và source transaction.
- Audit thay đổi behavior template, reward, badge, role và permission.

## 4. Media privacy

- Ảnh/video học sinh không lưu ở public bucket mặc định.
- Dùng signed URL thời hạn ngắn.
- Metadata phải gắn class/student/visibility.
- Không cho phép phụ huynh tải danh sách media của học sinh khác.
- Có cơ chế xóa/ẩn media theo yêu cầu quản trị.

## 5. PII tối thiểu

Không thu thập dữ liệu không cần thiết. MVP chỉ cần họ tên, ngày sinh nếu cần, avatar, lớp và thông tin liên hệ guardian tối thiểu.

Không nên lưu CCCD, địa chỉ nhà chi tiết, dữ liệu sức khỏe hoặc thông tin nhạy cảm khác nếu không có use case rõ ràng.

## 6. Authentication

- Email/OTP hoặc SSO phù hợp.
- Session expiry hợp lý.
- Rate-limit login/OTP.
- Admin/teacher nên có MFA khi hệ thống mở rộng.

## 7. Parent linking

Không cho guardian tự nhập mã học sinh dễ đoán rồi xem dữ liệu.

Luồng an toàn:
1. Teacher/admin tạo invitation có token một lần.
2. Guardian xác thực account.
3. Token hết hạn sau khi dùng/thời gian ngắn.
4. Teacher có thể revoke relation.

## 8. Content visibility

Mỗi praise post / teacher note cần visibility rõ:
- teacher_only
- related_guardians
- class

Không mặc định public internet.

## 9. Logging

Audit log cần cho:
- login bất thường;
- thay đổi quyền;
- thêm/xóa guardian relation;
- điều chỉnh điểm;
- thay đổi dữ liệu học sinh;
- export dữ liệu.

Không log password, OTP, access token hoặc nội dung nhạy cảm không cần thiết.

## 10. Backup & retention

- Backup DB định kỳ.
- Có chính sách retention theo năm học.
- Cho phép archive lớp cũ.
- Khi xóa dữ liệu phải xử lý cả object storage liên quan.

## 11. AI future-proofing

Nếu sau này dùng AI để tạo nhận xét:
- chỉ gửi dữ liệu tối thiểu cần thiết;
- không để AI tự động gửi nhận xét cho phụ huynh;
- teacher review bắt buộc;
- không suy đoán đặc điểm tâm lý, sức khỏe hay năng lực nhạy cảm từ hành vi lớp học.
