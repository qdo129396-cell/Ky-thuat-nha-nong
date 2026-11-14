# 07. Tiêu chí nghiệm thu Giai đoạn 1

## 1. Phạm vi đã hoàn thành

| Hạng mục | Trạng thái | Tài liệu |
|---|---|---|
| Phân tích mục tiêu, tác nhân và phạm vi | Hoàn thành | `01-requirements-analysis.md` |
| Functional/non-functional requirements | Hoàn thành | `01-requirements-analysis.md` |
| Quy tắc nghiệp vụ và rủi ro | Hoàn thành | `01-requirements-analysis.md` |
| Kiến trúc frontend/backend/database | Hoàn thành | `02-system-architecture.md` |
| Use Case | Hoàn thành | `03-use-cases-and-uml.md` |
| Activity Diagram | Hoàn thành | `03-use-cases-and-uml.md` |
| Sequence Diagram | Hoàn thành | `03-use-cases-and-uml.md` |
| Class Diagram | Hoàn thành | `03-use-cases-and-uml.md` |
| ERD và từ điển dữ liệu | Hoàn thành | `04-erd-and-data-dictionary.md` |
| Wireframe desktop/tablet/mobile | Hoàn thành | `05-wireframes.md` |
| REST API resource/endpoint/error contract | Hoàn thành ở mức thiết kế | `06-api-overview.md` |

## 2. Đối chiếu quy trình 8 phần của một giai đoạn

1. **Phân tích:** đã xác định scope, actor, FR, NFR, business rule và điểm cần duyệt.
2. **Thiết kế:** đã có kiến trúc, UML, ERD, wireframe và API overview.
3. **Database:** mới thiết kế logic, constraint và index; chưa tạo migration vì thuộc Giai đoạn 2.
4. **API:** đã chốt contract tổng quan; chưa viết route/controller.
5. **Backend:** đã chốt module/layer; không viết mã chức năng trong Giai đoạn 1.
6. **Frontend:** đã chốt information architecture/wireframe/responsive; không viết component trong Giai đoạn 1.
7. **Testing:** đã kiểm tra cấu trúc tài liệu, liên kết nội bộ và cặp code fence; test code bắt đầu cùng mã nguồn.
8. **Commit Message:** đề xuất ở mục 6; môi trường hiện không có lệnh Git trong `PATH` nên chưa thể tạo commit.

Việc không tạo database/backend/frontend ở Giai đoạn 1 là chủ ý để tuân thủ yêu cầu “không tạo tất cả code trong một lần”.

## 3. Ma trận phủ yêu cầu

| Nhóm yêu cầu gốc | Đã thể hiện tại |
|---|---|
| Authentication | FR-01, auth sequence, auth entities, `/auth/*` |
| Hồ sơ | FR-02, users/images/follow ERD, profile wireframe, `/users/*` |
| Blog và rich text | FR-03, publish activity/sequence, posts/images ERD, editor wireframe, `/posts/*` |
| Like/comment/reply/follow | FR-04, interaction activity, entities, API riêng từng resource |
| Tìm kiếm | FR-05, list wireframe, query `q/author/crop/category` |
| Thông báo | FR-06, interaction flow, notification entity/page/API |
| Quản trị/dashboard | FR-07, audit log, admin wireframe và `/admin/*` |
| Upload | BR-07, upload sequence/architecture, image metadata/API |
| Bảo mật | Architecture mục 5–6, validation/authorization pipeline, error contract |
| Responsive | Breakpoint, từng trang và accessibility checklist |
| Báo cáo/sơ đồ | Use Case, Activity, Sequence, Class, ERD, Architecture |

## 4. Kiểm tra đã thực hiện

- Tất cả liên kết từ README đến tài liệu Giai đoạn 1 tồn tại.
- Mọi khối Mermaid có code fence đóng/mở cân bằng.
- Tên entity chính thống nhất: User, Role, Post, Category, Comment, Like, Follow, Notification, Image.
- Mỗi bảng có PK, `created_at`, `updated_at`; mọi quan hệ có foreign key cụ thể.
- Các quy tắc unique cho email, like và follow xuất hiện cả trong phân tích lẫn ERD.
- Không có mã backend/frontend/database executable được tạo ngoài phạm vi.

Mermaid chưa được render tự động vì workspace trống và chưa có toolchain. Khi khởi tạo dự án, CI nên bổ sung markdown lint, link check và render/check Mermaid.

## 5. Điều kiện để đóng Giai đoạn 1

Giai đoạn 1 được xem là duyệt khi chủ dự án xác nhận:

- Stack React + Express + TypeScript + PostgreSQL.
- JWT access + refresh token có thể thu hồi.
- Xóa mềm bài/bình luận và khóa user thay vì xóa cứng.
- Giới hạn upload ban đầu: 10 ảnh/bài, 5 MB/ảnh, JPEG/PNG/WebP.
- Một cây trồng chính ở hồ sơ và một `cropName` tùy chọn trên mỗi bài trong MVP.

Nếu có thay đổi, cập nhật tài liệu trước khi tạo migration ở Giai đoạn 2.

## 6. Commit message đề xuất

```text
docs(phase-1): add requirements architecture ERD UML and wireframes
```

Commit body gợi ý:

```text
- define product scope, business rules and non-functional requirements
- document REST architecture and security decisions
- add use case, activity, sequence, class and ER diagrams
- add responsive wireframes and initial API contract
```

## 7. Kế hoạch Giai đoạn 2 sau khi được duyệt

1. Khởi tạo `frontend/`, `backend/` và cấu hình môi trường.
2. Tạo schema/migration/seed cho toàn bộ nền dữ liệu cần authentication.
3. Triển khai register, login, refresh, logout, forgot/reset/change password.
4. Tạo trang đăng nhập/đăng ký/quên mật khẩu và auth state phía frontend.
5. Viết unit/integration/API tests cho auth, validation, RBAC và token rotation.
6. Chạy lint, typecheck, test và migration smoke test.
7. Đề xuất commit message Giai đoạn 2; chưa làm CRUD Blog trước khi auth đạt nghiệm thu.
