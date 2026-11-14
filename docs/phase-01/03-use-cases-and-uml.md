# 03. Use Case và các sơ đồ UML

## 1. Use Case tổng quan

```mermaid
flowchart LR
    G([Khách])
    M([Thành viên])
    A([Quản trị viên])

    subgraph SYS[Hệ thống chia sẻ kỹ thuật canh tác]
      UC01((Đăng ký))
      UC02((Đăng nhập / Quên mật khẩu))
      UC03((Xem và tìm kiếm bài))
      UC04((Quản lý hồ sơ))
      UC05((Tạo / sửa / xóa bài))
      UC06((Upload nhiều ảnh))
      UC07((Like / bỏ like))
      UC08((Bình luận / trả lời))
      UC09((Theo dõi / bỏ theo dõi))
      UC10((Xem thông báo))
      UC11((Xem dashboard))
      UC12((Quản lý người dùng))
      UC13((Kiểm duyệt bài / bình luận))
      UC14((Quản lý danh mục))
    end

    G --> UC01
    G --> UC02
    G --> UC03
    M --> UC03
    M --> UC04
    M --> UC05
    M --> UC06
    M --> UC07
    M --> UC08
    M --> UC09
    M --> UC10
    A --> UC11
    A --> UC12
    A --> UC13
    A --> UC14
```

`ADMIN` kế thừa mọi khả năng phù hợp của `MEMBER`; sơ đồ chỉ nhấn mạnh use case quản trị.

## 2. Đặc tả Use Case chính

### UC-01 – Đăng ký

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Khách |
| Tiền điều kiện | Chưa đăng nhập |
| Luồng chính | Nhập họ tên, email, mật khẩu → hệ thống validate → kiểm tra email → hash password → tạo user role MEMBER → trả kết quả |
| Ngoại lệ | Email đã tồn tại; mật khẩu yếu; dữ liệu sai định dạng |
| Hậu điều kiện | Tài khoản `ACTIVE` được tạo; không trả `password_hash` |

### UC-02 – Đăng nhập

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Khách |
| Tiền điều kiện | Có tài khoản |
| Luồng chính | Nhập email/mật khẩu → kiểm tra thông tin và trạng thái → tạo access/refresh token → ghi phiên |
| Ngoại lệ | Sai thông tin; tài khoản bị khóa; rate limit |
| Hậu điều kiện | Phiên đăng nhập hoạt động, refresh token chỉ lưu dạng hash |

### UC-03 – Tạo và xuất bản bài viết

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Thành viên |
| Tiền điều kiện | Đã đăng nhập, tài khoản hoạt động, danh mục hợp lệ |
| Luồng chính | Nhập nội dung → upload/chọn ảnh → validate và sanitize → lưu nháp hoặc xuất bản → trả bài viết |
| Ngoại lệ | Quá số ảnh/dung lượng; HTML không hợp lệ; danh mục bị tắt |
| Hậu điều kiện | Bài thuộc tác giả; slug duy nhất; ảnh liên kết đúng thứ tự |

### UC-04 – Bình luận hoặc trả lời

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Thành viên |
| Tiền điều kiện | Bài đang công khai và cho phép tương tác |
| Luồng chính | Gửi nội dung và `parentId` tùy chọn → validate → tạo comment → tạo notification cho người phù hợp |
| Ngoại lệ | Bài bị ẩn; parent không thuộc bài; nội dung rỗng/quá dài |
| Hậu điều kiện | Bình luận hiển thị; người nhận có thông báo, trừ tự tương tác |

### UC-05 – Theo dõi người dùng

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Thành viên |
| Tiền điều kiện | Cả hai tài khoản hoạt động |
| Luồng chính | Chọn Theo dõi → tạo quan hệ duy nhất → tạo thông báo cho người được theo dõi |
| Ngoại lệ | Tự theo dõi; đã theo dõi; user đích không tồn tại/bị khóa |
| Hậu điều kiện | Số người theo dõi được cập nhật nhất quán |

### UC-06 – Khóa tài khoản

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Quản trị viên |
| Tiền điều kiện | Admin đăng nhập; user đích tồn tại; không tự khóa chính mình |
| Luồng chính | Nhập lý do → chuyển trạng thái `BLOCKED` → thu hồi phiên → ghi audit log |
| Ngoại lệ | Không đủ quyền; cố khóa admin cuối cùng; user đã bị khóa |
| Hậu điều kiện | User không thể đăng nhập hoặc tương tác mới; nội dung cũ vẫn được giữ theo chính sách |

## 3. Activity Diagram – Đăng nhập

```mermaid
flowchart TD
    S([Bắt đầu]) --> I[Nhập email và mật khẩu]
    I --> V{Dữ liệu hợp lệ?}
    V -- Không --> E1[Trả lỗi validation]
    V -- Có --> F[Tra cứu user theo email]
    F --> C{Password đúng?}
    C -- Không --> E2[Trả lỗi thông tin đăng nhập]
    C -- Có --> B{Tài khoản hoạt động?}
    B -- Không --> E3[Trả lỗi tài khoản bị khóa]
    B -- Có --> T[Tạo access token và refresh token]
    T --> H[Lưu hash refresh token]
    H --> R[Trả user và token]
    E1 --> X([Kết thúc])
    E2 --> X
    E3 --> X
    R --> X
```

## 4. Activity Diagram – Xuất bản bài

```mermaid
flowchart TD
    S([Bắt đầu]) --> A[Soạn tiêu đề, danh mục, nội dung]
    A --> P[Chọn ảnh]
    P --> V{Form và ảnh hợp lệ?}
    V -- Không --> E[Hiển thị lỗi tại trường]
    E --> A
    V -- Có --> U[Upload ảnh, nhận imageId]
    U --> M{Upload thành công?}
    M -- Không --> Q[Cho phép thử lại hoặc bỏ ảnh lỗi]
    Q --> P
    M -- Có --> D{Lưu nháp hay xuất bản?}
    D -- Nháp --> DR[Lưu trạng thái DRAFT]
    D -- Xuất bản --> SA[Sanitize nội dung phía server]
    SA --> PB[Lưu trạng thái PUBLISHED và publishedAt]
    DR --> R[Trả bài viết]
    PB --> R
    R --> X([Kết thúc])
```

## 5. Activity Diagram – Tương tác và thông báo

```mermaid
flowchart TD
    S([Thành viên tương tác]) --> K{Loại tương tác}
    K -->|Like| L[Upsert like duy nhất]
    K -->|Comment/Reply| C[Tạo comment hợp lệ]
    K -->|Follow| F[Tạo follower duy nhất]
    L --> O[Xác định chủ bài]
    C --> O2[Xác định chủ bài hoặc chủ comment cha]
    F --> O3[Xác định user được theo dõi]
    O --> N{Tác nhân khác người nhận?}
    O2 --> N
    O3 --> N
    N -- Có --> T[Tạo notification]
    N -- Không --> Z[Bỏ qua notification]
    T --> R[Trả kết quả]
    Z --> R
```

## 6. Sequence Diagram – Đăng nhập và refresh

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant F as Frontend
    participant C as AuthController
    participant S as AuthService
    participant R as User/TokenRepository
    participant D as PostgreSQL

    U->>F: Nhập email, mật khẩu
    F->>C: POST /api/v1/auth/login
    C->>C: Validate request
    C->>S: login(email, password)
    S->>R: findByEmail(email)
    R->>D: SELECT tham số hóa
    D-->>R: User
    R-->>S: User
    S->>S: Verify hash + kiểm status
    S->>R: saveRefreshToken(hash, session)
    R->>D: INSERT refresh token
    S-->>C: Auth result
    C-->>F: 200 + accessToken + refresh cookie
    F-->>U: Mở phiên đăng nhập

    Note over F,D: Khi access token hết hạn
    F->>C: POST /api/v1/auth/refresh + cookie
    C->>S: rotateRefreshToken(token)
    S->>R: findValidToken(hash)
    R->>D: SELECT + UPDATE trong transaction
    S-->>C: Access token mới + refresh token mới
    C-->>F: 200 + token/cookie mới
```

## 7. Sequence Diagram – Tạo bài nhiều ảnh

```mermaid
sequenceDiagram
    actor U as Thành viên
    participant F as Frontend
    participant UP as Upload API
    participant PS as Post API
    participant ST as Storage
    participant DB as PostgreSQL

    U->>F: Soạn bài và chọn ảnh
    F->>UP: POST /api/v1/images (multipart)
    UP->>UP: Auth + validate MIME/size/count
    loop Mỗi ảnh hợp lệ
      UP->>ST: Lưu tên UUID
      ST-->>UP: storageKey
      UP->>DB: INSERT image metadata
    end
    UP-->>F: 201 + imageIds
    F->>PS: POST /api/v1/posts + imageIds
    PS->>PS: Validate + sanitize + authorize
    PS->>DB: Transaction INSERT post + link images
    DB-->>PS: Post
    PS-->>F: 201 Created
    F-->>U: Hiển thị bài đã tạo
```

## 8. Sequence Diagram – Bình luận và thông báo

```mermaid
sequenceDiagram
    actor U as Thành viên
    participant C as CommentController
    participant S as CommentService
    participant R as Repositories
    participant D as PostgreSQL

    U->>C: POST /posts/{id}/comments
    C->>C: Auth + validate
    C->>S: createComment(actor, post, parent, body)
    S->>R: Kiểm tra post và parent
    R->>D: SELECT tham số hóa
    S->>D: BEGIN transaction
    S->>R: Tạo comment
    R->>D: INSERT comment
    alt actor khác recipient
      S->>R: Tạo notification
      R->>D: INSERT notification
    end
    S->>D: COMMIT
    S-->>C: Comment DTO
    C-->>U: 201 Created
```

## 9. Class Diagram – Miền nghiệp vụ và tầng ứng dụng

```mermaid
classDiagram
    class User {
      +UUID id
      +string email
      +string fullName
      +UserStatus status
      +updateProfile()
      +canAuthenticate()
    }
    class Role {
      +UUID id
      +string name
    }
    class Post {
      +UUID id
      +string title
      +string contentHtml
      +PostStatus status
      +publish()
      +hide()
    }
    class Category {
      +UUID id
      +string name
      +string slug
    }
    class Comment {
      +UUID id
      +string body
      +CommentStatus status
      +edit()
      +remove()
    }
    class Like {
      +UUID id
    }
    class Follow {
      +UUID id
    }
    class Image {
      +UUID id
      +string storageKey
      +string mimeType
      +int sizeBytes
    }
    class Notification {
      +UUID id
      +NotificationType type
      +bool isRead
      +markRead()
    }

    Role "1" --> "many" User
    User "1" --> "many" Post : authors
    Category "1" --> "many" Post
    Post "1" --> "many" Image
    Post "1" --> "many" Comment
    Comment "0..1" --> "many" Comment : parent
    User "1" --> "many" Comment : writes
    User "1" --> "many" Like
    Post "1" --> "many" Like
    User "1" --> "many" Follow : follower
    User "1" --> "many" Follow : following
    User "1" --> "many" Notification : recipient

    class PostController
    class PostService {
      +createPost(actorId, input)
      +updatePost(actorId, postId, input)
      +deletePost(actorId, postId)
    }
    class PostRepository {
      <<interface>>
      +findById(id)
      +create(data)
      +update(id, data)
      +paginate(filter)
    }
    class OrmPostRepository
    PostController --> PostService
    PostService --> PostRepository
    PostRepository <|.. OrmPostRepository
```

## 10. Ma trận truy vết

| Yêu cầu | Use Case | Entity chính | API nhóm |
|---|---|---|---|
| Authentication | UC-01, UC-02 | User, Role, RefreshToken, PasswordResetToken | `/auth/*` |
| Hồ sơ | UC quản lý hồ sơ | User, Image, Follow | `/users/*` |
| Blog | UC-03 | Post, Category, Image | `/posts`, `/categories`, `/images` |
| Bình luận | UC-04 | Comment, Notification | `/posts/{id}/comments`, `/comments/*` |
| Like | UC tương tác | Like, Notification | `/posts/{id}/likes` |
| Theo dõi | UC-05 | Follow, Notification | `/users/{id}/followers` |
| Quản trị | UC-06 | User, Post, Comment, Category, AuditLog | `/admin/*` |
