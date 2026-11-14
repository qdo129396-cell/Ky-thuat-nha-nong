# Giai đoạn 2 – Database và Authentication

## 1. Phân tích

Mục tiêu giai đoạn là tạo nền dữ liệu đầy đủ và hoàn thiện vòng đời xác thực trước khi Blog phụ thuộc vào user/role. Phạm vi gồm đăng ký, đăng nhập, refresh, đăng xuất, quên/reset/đổi mật khẩu và lấy user hiện tại. CRUD Blog chưa được triển khai.

Rủi ro chính được xử lý:

- JWT access token không thể thu hồi trực tiếp: dùng access token ngắn hạn và refresh token ngẫu nhiên có hash trong database.
- Refresh token bị đánh cắp/tái sử dụng: rotation theo `family_id`; reuse thu hồi cả token family.
- Enumeration email: forgot-password luôn trả cùng thông điệp.
- Race condition khi token reset/refresh dùng đồng thời: cập nhật có điều kiện trong transaction.
- SQL Injection: repository dùng placeholder PostgreSQL `$1...$n`, không nối input vào SQL.
- XSS/payload: JSON limit, validation ở biên API, Helmet; sanitize rich text sẽ bổ sung cùng Blog ở Giai đoạn 3.

## 2. Thiết kế

Backend áp dụng luồng:

```text
Route → rate limit/auth middleware → controller → AuthService
      → AuthRepository interface → PostgreSQL repository
```

- Controller chỉ xử lý HTTP, cookie và response contract.
- Service chứa quy tắc đăng nhập, token rotation, reset và đổi mật khẩu.
- Repository giữ parameterized SQL và transaction.
- `PasswordHasher`, `MailService`, `AuthRepository` là interface để test không phụ thuộc hạ tầng.
- Access token chỉ nằm trong bộ nhớ frontend; refresh token nằm trong cookie HttpOnly, không lưu token vào `localStorage`.

Trong quá trình audit, React Router có advisory chồng lấn giữa các phiên bản. Dependency đã được loại bỏ; frontend dùng History API router nhỏ cho các route Giai đoạn 2. Kết quả `npm audit` là 0 vulnerability.

## 3. Database

Migration: `backend/database/migrations/001_initial_schema.sql`.

Đã tạo 12 bảng:

- `roles`, `users`, `categories`, `posts`, `images`, `comments`.
- `likes`, `followers`, `notifications`.
- `refresh_tokens`, `password_reset_tokens`, `audit_logs`.

Schema có:

- UUID primary key, foreign key, `created_at`, `updated_at` ở mọi bảng.
- Enum trạng thái, check constraint, unique constraint và index theo ERD.
- Trigger tự cập nhật `updated_at`.
- Unique index `lower(email)` bảo vệ email không phân biệt hoa/thường.
- Unique `(post_id, user_id)` cho like và `(follower_id, following_id)` cho follow.
- Migration runner có checksum, từ chối migration đã áp dụng nhưng bị sửa.
- Seed idempotent cho role/category và admin từ biến môi trường.

Migration và seed đã chạy thành công trên PGlite, một PostgreSQL test engine nhúng. Máy hiện chưa có PostgreSQL server/Docker nên chưa chạy smoke test kết nối server bên ngoài; contract SQL PostgreSQL đã được kiểm tra bằng engine trong test tự động.

## 4. API

Base URL: `/api/v1`.

| Method | Endpoint | Kết quả |
|---|---|---|
| POST | `/auth/register` | Tạo MEMBER, hash password |
| POST | `/auth/login` | Access token + refresh cookie |
| POST | `/auth/refresh` | Xoay access/refresh token |
| POST | `/auth/logout` | Thu hồi phiên hiện tại |
| POST | `/auth/logout-all` | Thu hồi mọi phiên của user |
| POST | `/auth/forgot-password` | Tạo token reset và gửi qua mail adapter |
| POST | `/auth/reset-password` | Dùng token một lần, đổi password, thu hồi phiên |
| PUT | `/auth/password` | Xác minh password cũ, đổi và đăng xuất mọi thiết bị |
| GET | `/auth/me` | User hiện tại |
| GET | `/health` | Health response |

Response thành công/lỗi theo contract `success`, `data/error`, `requestId`. Validation Zod trả `VALIDATION_ERROR` kèm lỗi từng trường. Route auth nhạy cảm có rate limit.

## 5. Backend

Thành phần chính:

- `app.ts`: security middleware, CORS, request logging/redaction, router và error handler.
- `AuthService`: nghiệp vụ xác thực độc lập Express/PostgreSQL.
- `PgAuthRepository`: truy vấn và transaction PostgreSQL.
- `TokenService`: ký/xác minh JWT HS256 với secret tối thiểu 32 ký tự.
- `ArgonPasswordHasher`: Argon2id, memory cost 19 MiB, time cost 2, hỗ trợ pepper.
- `DevelopmentMailService`: in reset link ở môi trường development; production phải thay adapter email thực.
- Config được validate khi khởi động; secret không hard-code.

Cookie refresh có `HttpOnly`, `SameSite=Lax`, path `/api/v1/auth`; `Secure` tự bật ở production. Token hash, password và Authorization/Cookie được loại khỏi log.

## 6. Frontend

Đã tạo giao diện responsive:

- Đăng nhập.
- Đăng ký.
- Quên mật khẩu.
- Đặt lại mật khẩu.
- Đổi mật khẩu có protected route.
- Auth state khôi phục qua refresh cookie.
- Trang chủ nền để xác nhận trạng thái đăng nhập/đăng xuất; Blog chưa triển khai.

Form có label, lỗi từng trường, trạng thái loading, server error và target tương tác phù hợp mobile. Màu xanh lá, trắng và nâu đất bám theo wireframe Giai đoạn 1.

## 7. Testing

Kết quả tại thời điểm nghiệm thu:

| Kiểm tra | Kết quả |
|---|---|
| Backend API tests | 6/6 pass |
| PostgreSQL migration/seed tests | 3/3 pass |
| Frontend validation test | 1/1 pass |
| Tổng | 10/10 pass |
| TypeScript strict typecheck | Pass cả backend/frontend |
| Production build | Pass cả backend/frontend |
| Argon2id native smoke test | Pass |
| `npm audit` | 0 vulnerability |

Các case chính gồm JSON contract, validation, email normalization, không lộ password hash, cookie HttpOnly, `/me`, refresh rotation, reuse detection, forgot/reset, session revocation, đủ bảng/cột migration, seed idempotent và unique email không phân biệt hoa thường.

## 8. Commit Message

```text
feat(auth): implement database foundation and secure authentication
```

Commit body gợi ý:

```text
- add PostgreSQL migration, constraints, indexes and seed data
- implement JWT access and rotating refresh-token authentication
- add register, login, logout, password reset and change-password APIs
- add responsive authentication pages and in-memory access-token state
- add API, migration and frontend validation tests
```

Môi trường chưa có Git trong `PATH`, vì vậy commit message đã chuẩn bị nhưng chưa tạo commit vật lý.

## Điều kiện chuyển Giai đoạn 3

Giai đoạn 2 đã đạt tiêu chí kỹ thuật. Giai đoạn 3 chỉ triển khai CRUD Blog: category lookup, create/draft/publish, list/search, detail, edit/delete ownership, rich-text sanitation và các trang blog tương ứng. Upload file vật lý vẫn để Giai đoạn 4; Giai đoạn 3 chỉ chuẩn bị liên kết ảnh theo contract nếu cần.
