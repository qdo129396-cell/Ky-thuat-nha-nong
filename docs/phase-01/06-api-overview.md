# 06. Đặc tả REST API mức tổng quan

Tài liệu này chốt resource và contract để ERD, backend và frontend cùng một ngôn ngữ. Request/response chi tiết và OpenAPI sẽ được tạo theo từng giai đoạn triển khai, không viết toàn bộ code API ở Giai đoạn 1.

## 1. Quy ước

- Base URL: `/api/v1`.
- JSON dùng `camelCase`; database dùng `snake_case`.
- ID là UUID; thời gian là ISO 8601 UTC.
- Danh sách luôn phân trang; mặc định `page=1`, `limit=20`, giới hạn tối đa 100.
- `GET` không thay đổi trạng thái nghiệp vụ.
- `PUT` dùng cho thao tác đặt trạng thái idempotent hoặc cập nhật toàn bộ resource; `PATCH` cập nhật một phần.
- Access token gửi qua `Authorization: Bearer <token>`; refresh token ở cookie HttpOnly.

## 2. JSON response chuẩn

### Thành công – một resource

```json
{
  "success": true,
  "data": {
    "id": "7e91d63d-35c8-4fd3-a450-540bfda3bd12",
    "title": "Kỹ thuật chăm sóc lúa giai đoạn đẻ nhánh"
  },
  "requestId": "req_01J..."
}
```

### Thành công – danh sách

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0
  },
  "requestId": "req_01J..."
}
```

### Lỗi

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ.",
    "details": [
      {
        "field": "email",
        "message": "Email không đúng định dạng."
      }
    ]
  },
  "requestId": "req_01J..."
}
```

Không trả stack trace, SQL, password hash, token hash hoặc chi tiết nội bộ.

## 3. Mã HTTP và mã lỗi

| HTTP | Mã ứng dụng tiêu biểu | Ý nghĩa |
|---:|---|---|
| 200 | `OK` | Đọc/cập nhật/xóa logic thành công |
| 201 | `RESOURCE_CREATED` | Tạo resource thành công |
| 204 | Không body | Xóa/đặt trạng thái idempotent không cần body |
| 400 | `VALIDATION_ERROR`, `INVALID_FILE` | Input sai |
| 401 | `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED` | Chưa xác thực/phiên hết hạn |
| 403 | `FORBIDDEN`, `ACCOUNT_BLOCKED`, `OWNERSHIP_REQUIRED` | Không có quyền |
| 404 | `USER_NOT_FOUND`, `POST_NOT_FOUND`, `COMMENT_NOT_FOUND` | Không tìm thấy resource có thể truy cập |
| 409 | `EMAIL_ALREADY_EXISTS`, `SLUG_CONFLICT`, `ALREADY_FOLLOWING` | Xung đột trạng thái/unique |
| 413 | `PAYLOAD_TOO_LARGE`, `FILE_TOO_LARGE` | Quá dung lượng |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | MIME không hỗ trợ |
| 422 | `BUSINESS_RULE_VIOLATION` | Đúng cú pháp nhưng sai quy tắc nghiệp vụ |
| 429 | `RATE_LIMIT_EXCEEDED` | Quá số request |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi không dự kiến |

## 4. Authentication

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký |
| POST | `/auth/login` | Public | Đăng nhập, tạo phiên |
| POST | `/auth/refresh` | Refresh cookie | Xoay access/refresh token |
| POST | `/auth/logout` | User | Thu hồi phiên hiện tại |
| POST | `/auth/logout-all` | User | Thu hồi mọi phiên |
| POST | `/auth/forgot-password` | Public | Yêu cầu link reset; response không lộ email tồn tại |
| POST | `/auth/reset-password` | Reset token | Đặt mật khẩu mới |
| PUT | `/auth/password` | User | Đổi mật khẩu bằng mật khẩu hiện tại |
| GET | `/auth/me` | User | Lấy user hiện tại |

Validation chính: email hợp lệ và tối đa 255 ký tự; password 8–128 ký tự; họ tên 2–100 ký tự. Rate limit chặt hơn cho login/forgot/reset.

## 5. Người dùng và hồ sơ

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/users` | Public | Danh sách nhà nông; lọc `q`, `crop`, `address`, phân trang |
| GET | `/users/{userId}` | Public | Hồ sơ công khai |
| GET | `/users/slug/{slug}` | Public | Hồ sơ theo slug |
| PATCH | `/users/me` | User | Cập nhật một phần hồ sơ của mình |
| PUT | `/users/me/avatar` | User | Gán ảnh avatar đã upload |
| DELETE | `/users/me/avatar` | User | Gỡ avatar |
| PUT | `/users/me/cover` | User | Gán ảnh bìa đã upload |
| DELETE | `/users/me/cover` | User | Gỡ ảnh bìa |
| GET | `/users/{userId}/posts` | Public | Bài công khai của user; owner có thể yêu cầu nháp của mình |
| GET | `/users/{userId}/followers` | Public | Danh sách người theo dõi |
| GET | `/users/{userId}/following` | Public | Danh sách đang theo dõi |
| PUT | `/users/{userId}/followers/me` | User | Theo dõi idempotent |
| DELETE | `/users/{userId}/followers/me` | User | Bỏ theo dõi idempotent |

Không trả email/phone trong public DTO nếu chính sách riêng tư chưa cho phép.

## 6. Danh mục

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/categories` | Public | Danh mục đang hoạt động |
| GET | `/categories/{categoryId}` | Public | Chi tiết danh mục |
| POST | `/admin/categories` | Admin | Tạo danh mục |
| PUT | `/admin/categories/{categoryId}` | Admin | Cập nhật toàn bộ danh mục |
| PATCH | `/admin/categories/{categoryId}/status` | Admin | Bật/tắt danh mục |
| DELETE | `/admin/categories/{categoryId}` | Admin | Xóa nếu không vi phạm quan hệ hoặc chuyển inactive |

## 7. Bài viết và tìm kiếm

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/posts` | Public | Danh sách/tìm kiếm bài công khai |
| GET | `/posts/{postId}` | Public/Owner | Chi tiết theo ID |
| GET | `/posts/slug/{slug}` | Public/Owner | Chi tiết theo slug |
| POST | `/posts` | User | Tạo bài nháp hoặc xuất bản |
| PUT | `/posts/{postId}` | Owner | Cập nhật toàn bộ bài, đáp ứng REST contract yêu cầu |
| PATCH | `/posts/{postId}` | Owner | Cập nhật một phần bài |
| PATCH | `/posts/{postId}/status` | Owner/Admin | Đổi trạng thái theo quyền và state transition |
| DELETE | `/posts/{postId}` | Owner/Admin | Xóa mềm bài |

Query cho `GET /posts`:

| Query | Mô tả |
|---|---|
| `q` | Tìm trong tiêu đề/plain text theo phạm vi MVP |
| `author` | UUID hoặc slug tác giả tùy contract chi tiết |
| `crop` | Cây trồng của bài |
| `category` | UUID/slug danh mục |
| `sort` | `newest`, `oldest`, `popular` |
| `page`, `limit` | Phân trang |

Body tạo/cập nhật gồm `title`, `categoryId`, `cropName`, `excerpt`, `contentHtml`, `status`, `imageIds`. Backend sanitize và sinh `contentText`; không tin nội dung đã sanitize từ client.

## 8. Upload ảnh

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/images` | User | Upload 1–10 ảnh qua `multipart/form-data` |
| GET | `/images/{imageId}` | Public/Owner | Metadata ảnh |
| DELETE | `/images/{imageId}` | Owner/Admin | Xóa ảnh chưa dùng hoặc đánh dấu chờ dọn |
| PATCH | `/posts/{postId}/images/order` | Owner | Đổi thứ tự ảnh của bài |

Server kiểm chữ ký/MIME thực tế, giới hạn 5 MB/ảnh, tổng request, số lượng, pixel dimension và ownership. Tên lưu trữ dùng UUID; tên gốc chỉ là metadata.

## 9. Bình luận

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/posts/{postId}/comments` | Public | Bình luận visible dạng cây nông, phân trang comment gốc |
| POST | `/posts/{postId}/comments` | User | Tạo comment; `parentId` tùy chọn |
| PATCH | `/comments/{commentId}` | Owner | Sửa nội dung |
| DELETE | `/comments/{commentId}` | Owner/Admin | Xóa mềm |

Body từ 1–2000 ký tự sau khi trim. `parentId` phải thuộc cùng bài. Response reply không tải vô hạn; dùng limit riêng nếu dữ liệu lớn.

## 10. Like

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/posts/{postId}/likes` | Public | Danh sách/tổng lượt thích phân trang |
| PUT | `/posts/{postId}/likes/me` | User | Đặt trạng thái đã thích, idempotent |
| DELETE | `/posts/{postId}/likes/me` | User | Bỏ thích, idempotent |

Không dùng `POST /likes/toggle` vì toggle không an toàn khi client retry; PUT/DELETE biểu đạt trạng thái đích rõ ràng.

## 11. Thông báo

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/notifications` | User | Danh sách của chính mình; lọc `isRead` |
| GET | `/notifications/unread-count` | User | Tổng chưa đọc |
| PATCH | `/notifications/{notificationId}/read` | Owner | Đánh dấu một thông báo đã đọc |
| PATCH | `/notifications/read-all` | User | Đánh dấu tất cả đã đọc |
| DELETE | `/notifications/{notificationId}` | Owner | Xóa khỏi hộp thư cá nhân nếu chính sách cho phép |

## 12. Admin

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/admin/dashboard/summary` | Admin | Tổng user/post/comment/like |
| GET | `/admin/dashboard/activity` | Admin | Chuỗi số liệu theo ngày/khoảng thời gian |
| GET | `/admin/users` | Admin | Tìm/lọc user |
| GET | `/admin/users/{userId}` | Admin | Chi tiết quản trị |
| PATCH | `/admin/users/{userId}/status` | Admin | Khóa/mở khóa; yêu cầu reason khi khóa |
| GET | `/admin/posts` | Admin | Tìm/lọc mọi trạng thái bài |
| DELETE | `/admin/posts/{postId}` | Admin | Xóa mềm/ẩn bài và audit |
| GET | `/admin/comments` | Admin | Tìm/lọc bình luận |
| DELETE | `/admin/comments/{commentId}` | Admin | Xóa mềm/ẩn bình luận và audit |
| GET | `/admin/audit-logs` | Admin | Xem lịch sử hành động quản trị |

Admin không được tự khóa chính mình; hệ thống phải tránh khóa admin hoạt động cuối cùng.

## 13. Validation và phân quyền theo lớp

```text
Request
  → giới hạn payload / rate limit
  → xác thực JWT (nếu route bảo vệ)
  → validate params + query + body
  → controller
  → service kiểm role + ownership + state transition
  → repository / database constraints
  → DTO loại bỏ trường nhạy cảm
  → response chuẩn
```

Validation không chỉ dựa vào frontend. Database constraints là lớp bảo vệ cuối cho unique, foreign key và check; lỗi constraint được ánh xạ thành mã ứng dụng có nghĩa.

## 14. Ví dụ validation bài viết

| Trường | Quy tắc MVP |
|---|---|
| title | Trim, 10–200 ký tự |
| categoryId | UUID, category tồn tại và active |
| cropName | Tùy chọn, tối đa 100 ký tự |
| excerpt | Tùy chọn, tối đa 500 ký tự |
| contentHtml | Bắt buộc khi publish; giới hạn payload; sanitize allowlist |
| status | Chỉ `DRAFT` hoặc `PUBLISHED` với member |
| imageIds | Mảng UUID duy nhất, tối đa 10, đều thuộc uploader và chưa gắn resource khác |

## 15. Versioning và tương thích

Breaking change tạo `/api/v2`; bổ sung field optional không cần tăng version. OpenAPI ở backend là nguồn sự thật ở các giai đoạn code; frontend sinh/đồng bộ type từ contract để giảm sai lệch.
