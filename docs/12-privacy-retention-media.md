# Privacy, retention và media handling

## Phân loại dữ liệu

- **PII học sinh:** họ tên, mã học sinh, ngày sinh, giới tính, avatar, lớp/tổ/chỗ ngồi.
- **PII guardian:** tên, email, phone, quan hệ và liên kết can-view.
- **Dữ liệu giáo dục nhạy cảm:** điểm, hành vi, task, badge, ghi chú giáo viên, praise.
- **Dữ liệu bảo mật:** session/cookie, invitation token, Blob token, connection string.

Chỉ trả về dữ liệu cần cho màn hình hiện tại. Parent chỉ được xem child có quan hệ `canView=true`; teacher chỉ được xem class membership; admin chỉ được xem organization membership. Không đưa token hoặc secret vào audit/log/CSV.

## Retention baseline

- Score transactions, redemption history và audit cần giữ để giải trình; không hard-delete score history.
- Guardian invitation token chỉ lưu hash; invitation hết hạn/revoked không được dùng lại. Token thô chỉ tồn tại trong link gửi cho người dùng.
- Audit JSON mới chỉ lưu action, identifiers, counters, trạng thái trước/sau và idempotency fingerprint; tránh email, phone, tên học sinh, note và media URL.
- Media phải private, truy cập qua route đã xác thực và kiểm tra quyền mỗi request. Khi student/archive hoặc guardian revoke, access query phải không còn trả media; cleanup Blob là workflow riêng có retry/audit.
- Khi chốt retention period theo chính sách nhà trường, chạy deletion job theo organization và lưu kết quả aggregate, không log PII. Chưa tự động xóa production data khi policy chưa được duyệt.

## Upload requirements

- Allowlist MIME, giới hạn 10 MB cho ảnh và 50 MB cho video, giới hạn pathname và kiểm tra magic bytes server-side.
- Không tin `Content-Type` do client khai báo; callback phải xác thực session/actor và kiểm tra lại quyền write trên praise post.
- Ảnh được kiểm tra magic bytes, đọc lại từ private Blob, giới hạn 24 triệu pixel, resize tối đa 2400px và re-encode WebP quality 82 ở server trước khi persist. Pipeline không giữ metadata nguồn nên EXIF/GPS bị loại khỏi asset đã lưu; kích thước và MIME WebP được ghi vào `media_assets`.
- Video hiện chỉ kiểm tra container signature/size; chưa có server-side transcode/metadata stripping. Không tuyên bố video EXIF/GPS sanitization hoàn tất cho đến khi pipeline đó được triển khai.
- Serve qua private media endpoint với `no-store`, không dùng URL public lâu hạn. Chỉ giữ `inline` cho loại media cần embed và kiểm soát MIME; loại không cần embed nên chuyển `attachment`.

Khi xóa media, application xóa Blob trước rồi xóa row DB trong transaction. Nếu một bước lỗi, job cleanup/reconciliation phải được chạy lại từ audit/storage inventory; không coi client callback là bằng chứng duy nhất rằng object đã bị xóa.

## Avatar assets

Avatar preset dùng source trong thư mục local `avatar/`, build thành WebP 384×384, kích thước mục tiêu dưới 100 KB và render bằng `next/image` với width/height/sizes/lazy loading. Không xóa legacy PNG cho đến khi dữ liệu DB đã canonicalize sang WebP và production smoke test xác nhận không còn URL `.png`.
