# 01. Phân tích yêu cầu

## 1. Mục tiêu sản phẩm

Hệ thống là không gian chia sẻ kiến thức nông nghiệp, giúp người dùng:

- Công bố kỹ thuật canh tác và kinh nghiệm sản xuất dưới dạng bài viết giàu nội dung.
- Ghi lại mùa vụ bằng nhiều hình ảnh.
- Xây dựng hồ sơ chuyên môn và độ tin cậy cá nhân.
- Tương tác qua thích, bình luận, trả lời và theo dõi.
- Tìm được nội dung theo tiêu đề, tác giả, cây trồng và danh mục.

Sản phẩm không phải sàn thương mại điện tử. Phiên bản này loại trừ sản phẩm, giá, tồn kho, giỏ hàng, đặt hàng, thanh toán, vận chuyển và đánh giá giao dịch.

## 2. Tác nhân

| Tác nhân | Mô tả | Quyền chính |
|---|---|---|
| Khách | Chưa đăng nhập | Xem bài công khai, tìm kiếm, xem hồ sơ công khai, đăng ký, đăng nhập, quên mật khẩu |
| Thành viên | Tài khoản hoạt động | Quản lý hồ sơ và bài của mình; tải ảnh; thích; bình luận; theo dõi; nhận thông báo |
| Quản trị viên | Thành viên có vai trò `ADMIN` | Xem dashboard; quản lý người dùng, bài, bình luận và danh mục |
| Hệ thống | Tác nhân tự động | Gửi thông báo, tạo token, kiểm tra quyền, xử lý ảnh và ghi nhật ký |

## 3. Yêu cầu chức năng

### FR-01 – Xác thực

- Đăng ký bằng họ tên, email và mật khẩu; email không trùng.
- Đăng nhập chỉ khi tài khoản ở trạng thái hoạt động.
- Đăng xuất phải thu hồi refresh token của phiên hiện tại.
- Quên mật khẩu dùng token một lần, lưu dạng hash, có hạn dùng.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại và thu hồi các phiên cũ.

### FR-02 – Hồ sơ

- Hiển thị avatar, ảnh bìa, giới thiệu, địa chỉ, số điện thoại, cây trồng chính và số năm kinh nghiệm.
- Thành viên chỉ sửa hồ sơ của chính mình.
- Trang công khai hiển thị thống kê bài viết, người theo dõi và đang theo dõi.
- Email và số điện thoại không mặc định hiển thị nếu chưa có chính sách quyền riêng tư rõ ràng; bản đầu chỉ công khai các trường được cấu hình.

### FR-03 – Bài viết

- Thành viên tạo, xem trước, lưu nháp, xuất bản, sửa và xóa mềm bài của mình.
- Bài có một danh mục, tiêu đề, mô tả ngắn, nội dung rich text và nhiều ảnh.
- Khách chỉ thấy bài `PUBLISHED`; chủ bài thấy cả bài nháp của mình.
- Slug là duy nhất; trạng thái tối thiểu gồm `DRAFT`, `PUBLISHED`, `HIDDEN`, `DELETED`.
- Tác giả không thể tự khôi phục bài bị quản trị viên ẩn.

### FR-04 – Tương tác

- Mỗi người chỉ thích một bài một lần; thao tác thích/bỏ thích có tính idempotent.
- Bình luận hỗ trợ trả lời theo một cấp hiển thị; dữ liệu vẫn lưu `parent_id` để mở rộng.
- Chủ bình luận được sửa/xóa mềm bình luận của mình; quản trị viên có thể ẩn/xóa.
- Người dùng không thể tự theo dõi chính mình; mỗi quan hệ theo dõi là duy nhất.

### FR-05 – Tìm kiếm

- Tìm theo từ khóa tiêu đề, tên/slug tác giả, cây trồng chính và danh mục.
- Kết quả có phân trang, sắp xếp mới nhất/phổ biến và chỉ trả bài công khai.
- Chuẩn hóa chuỗi tìm kiếm; giới hạn độ dài để tránh truy vấn tốn tài nguyên.

### FR-06 – Thông báo

- Tạo thông báo khi có người thích bài, bình luận/trả lời hoặc theo dõi.
- Không gửi thông báo khi tác nhân và người nhận là cùng một người.
- Thành viên có thể đánh dấu một hoặc tất cả thông báo là đã đọc.
- Các lượt thích liên tiếp có thể được gộp ở tầng hiển thị trong phiên bản sau; dữ liệu ban đầu lưu từng sự kiện.

### FR-07 – Quản trị

- Dashboard hiển thị tổng người dùng, bài viết, bình luận và lượt thích.
- Quản trị viên tìm/lọc người dùng và khóa/mở khóa tài khoản.
- Quản trị viên ẩn/xóa mềm bài, bình luận vi phạm và quản lý danh mục.
- Hành động quản trị quan trọng phải được ghi vào `audit_logs`.

## 4. Quy tắc nghiệp vụ

| ID | Quy tắc |
|---|---|
| BR-01 | Email được chuẩn hóa chữ thường và là duy nhất. |
| BR-02 | Tài khoản `BLOCKED` không thể đăng nhập, refresh token hoặc tạo tương tác mới. |
| BR-03 | Tác giả chỉ sửa/xóa tài nguyên của mình; `ADMIN` có quyền kiểm duyệt. |
| BR-04 | Một cặp `(user_id, post_id)` chỉ có tối đa một lượt thích. |
| BR-05 | Một cặp `(follower_id, following_id)` chỉ có một quan hệ và hai ID phải khác nhau. |
| BR-06 | Bình luận chỉ được tạo trên bài đang công khai và cho phép tương tác. |
| BR-07 | Chỉ ảnh JPEG, PNG hoặc WebP; tối đa 5 MB/ảnh và 10 ảnh/bài ở bản đầu. |
| BR-08 | Nội dung rich text được lọc theo allowlist ở backend trước khi lưu/hiển thị. |
| BR-09 | Xóa bài/bình luận là xóa mềm để phục vụ kiểm duyệt và audit. |
| BR-10 | Số liệu dashboard không tính bản ghi đã xóa mềm, trừ báo cáo kiểm duyệt. |

## 5. Yêu cầu phi chức năng

| Nhóm | Tiêu chí ban đầu |
|---|---|
| Bảo mật | JWT ngắn hạn, refresh token xoay vòng, hash mật khẩu Argon2id, RBAC, rate limit, validation, CORS, security headers |
| Hiệu năng | API danh sách phân trang; chỉ mục cho email, slug, khóa ngoại và trường tìm kiếm; ảnh có thumbnail/lazy loading |
| Khả dụng | Giao diện responsive từ 360 px; trạng thái loading/empty/error rõ ràng; thao tác bàn phím cơ bản |
| Tin cậy | Transaction cho nghiệp vụ nhiều bước; lỗi chuẩn hóa; log có `requestId`; backup database ở production |
| Bảo trì | TypeScript strict, module theo miền nghiệp vụ, SOLID, controller mỏng, test tự động, migration có version |
| Quan sát | Structured logging; health/readiness endpoint; theo dõi lỗi 5xx và thời gian phản hồi |

## 6. Phạm vi MVP và cải tiến sau

### MVP theo 10 giai đoạn

Xác thực, hồ sơ, CRUD bài, upload ảnh, bình luận/trả lời, thích, theo dõi, thông báo cơ bản, tìm kiếm, dashboard và quản trị.

### Chưa thuộc MVP

- Chat trực tiếp, livestream, nhóm cộng đồng.
- Xác minh danh tính/chứng chỉ nhà nông.
- Gợi ý nội dung bằng AI.
- Ứng dụng mobile native.
- Mọi chức năng thương mại điện tử.

## 7. Điểm cần duyệt trước Giai đoạn 2

1. Chấp thuận stack TypeScript + PostgreSQL hoặc yêu cầu stack khác.
2. Chấp thuận đăng nhập bằng email; OTP/xác minh email chưa nằm trong MVP bắt buộc.
3. Chấp thuận xóa mềm bài và bình luận.
4. Chấp thuận giới hạn 10 ảnh/bài, 5 MB/ảnh.
5. Chấp thuận chỉ lưu một `main_crop` dạng văn bản ở MVP; mô hình nhiều cây trồng có thể tách bảng sau.

## 8. Cải tiến kiến trúc được đề xuất

MVC thuần dễ khiến controller và model phình to. Dự án nên dùng **MVC + Service + Repository**: controller xử lý HTTP, service giữ nghiệp vụ, repository truy cập dữ liệu. Cấu trúc này vẫn đáp ứng MVC nhưng dễ test và thay đổi nơi lưu trữ.

JWT chỉ dùng access token không đáp ứng đăng xuất đáng tin cậy. Vì vậy thiết kế dùng access token ngắn hạn và refresh token được hash trong database, hỗ trợ xoay vòng/thu hồi. Đây là bổ sung cần thiết cho yêu cầu đăng xuất, quên mật khẩu và bảo mật phiên.
