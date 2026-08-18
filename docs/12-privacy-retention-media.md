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
- Media phải private, truy cập qua route đã xác thực và kiểm tra quyền mỗi request. Khi student/archive hoặc guardian revoke, access query của teacher/guardian không còn trả media; admin vẫn có quyền theo organization để thực hiện retention/deletion. Cleanup Blob là workflow riêng có retry/audit.
- Khi chốt retention period theo chính sách nhà trường, chạy deletion job theo organization và lưu kết quả aggregate, không log PII. Chưa tự động xóa production data khi policy chưa được duyệt.

## Upload requirements

- Allowlist MIME, giới hạn 10 MB cho ảnh, giới hạn pathname và kiểm tra magic bytes server-side. Video production đang fail-closed vì chưa có worker transcode/metadata stripping đã kiểm chứng.
- Không tin `Content-Type` do client khai báo; nhánh cấp token phải xác thực session/same-origin, còn callback `blob.upload-completed` phải dựa trên chữ ký Vercel Blob và token actor/class/post rồi kiểm tra lại quyền write trên praise post.
- Ảnh được kiểm tra magic bytes, đọc lại từ private Blob, giới hạn 24 triệu pixel, resize tối đa 2400px và re-encode WebP quality 82 ở server trước khi persist. Pipeline không giữ metadata nguồn nên EXIF/GPS bị loại khỏi asset đã lưu; kích thước và MIME WebP được ghi vào `media_assets`.
- Video hiện không được cấp Blob upload token và không được persist. Chỉ mở lại sau khi có quarantine private, transcode profile cố định, output validation, duration/dimension capture và cleanup khi callback/DB lỗi.
- Serve qua private media endpoint với `no-store`, không dùng URL public lâu hạn. Chỉ giữ `inline` cho loại media cần embed và kiểm soát MIME; loại không cần embed nên chuyển `attachment`.

Khi xóa media, application revoke row DB và ghi audit trước, sau đó xóa Blob; nếu Blob cleanup lỗi thì object không còn đường truy cập qua ứng dụng và được reconcile sau. Upload mới dùng prefix quarantine riêng; callback lỗi sẽ best-effort cleanup quarantine, còn sanitized object được giữ lại khi transaction outcome không chắc chắn để tránh xóa nhầm row đã commit. Có thể chạy `npm run media:reconcile` để lập inventory dry-run các Blob dưới prefix `praise/` không còn row DB và các DB row trỏ tới Blob đã mất (mặc định grace period 24 giờ). Xóa chỉ bật thủ công với `MEDIA_RECONCILE_DELETE=true`, `MEDIA_RECONCILE_CONFIRM=DELETE_ORPHAN_MEDIA`, `MEDIA_RECONCILE_EXPECTED_DATABASE`, `MEDIA_RECONCILE_EXPECTED_BLOB_STORE_ID` và `BLOB_STORE_ID` khớp; report chỉ ghi pathname, không ghi full URL. Không bật mặc định và không coi client callback là bằng chứng duy nhất rằng object đã bị xóa.

## Avatar assets

Avatar preset dùng source trong thư mục local `avatar/`, build thành WebP 384×384, kích thước mục tiêu dưới 100 KB và render bằng `next/image` với width/height/sizes/lazy loading. Không xóa legacy PNG cho đến khi dữ liệu DB đã canonicalize sang WebP và production smoke test xác nhận không còn URL `.png`.
