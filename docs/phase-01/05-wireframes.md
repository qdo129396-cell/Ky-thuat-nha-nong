# 05. Wireframe responsive

## 1. Định hướng giao diện

Giao diện tạo cảm giác đáng tin, gần gũi với nông nghiệp nhưng không dùng quá nhiều họa tiết. Nội dung và hình ảnh mùa vụ là trọng tâm.

### Màu đề xuất

| Token | Màu | Mục đích |
|---|---|---|
| `primary-700` | `#2F6B3B` | Nút chính, link quan trọng, header |
| `primary-500` | `#4F8A57` | Trạng thái active, badge |
| `primary-50` | `#F1F7F2` | Nền khối nhẹ |
| `earth-700` | `#6B4F3A` | Điểm nhấn nâu đất |
| `earth-100` | `#EFE5D8` | Nền tag/khối phụ |
| `surface` | `#FFFFFF` | Card và form |
| `background` | `#F7F8F4` | Nền trang |
| `text` | `#203025` | Chữ chính |
| `danger` | `#B42318` | Lỗi/xóa |

Màu không phải dấu hiệu trạng thái duy nhất; icon và nhãn chữ luôn đi kèm.

### Breakpoint

- Mobile: 360–767 px, một cột, bottom navigation cho chức năng chính.
- Tablet: 768–1023 px, lưới 2 cột khi phù hợp, sidebar chuyển thành drawer.
- Desktop: từ 1024 px, container tối đa khoảng 1200 px, bố cục content + sidebar.

## 2. Khung giao diện chung

### Desktop

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ LOGO  Trang chủ  Bài viết  Nhà nông    [ Tìm kiếm... ]   🔔  [Avatar ▾]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                     CONTAINER NỘI DUNG (max-width)                           │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Giới thiệu · Điều khoản · Quyền riêng tư                    © Nông Kỹ        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile

```text
┌──────────────────────────┐
│ ☰  LOGO      🔍  🔔      │
├──────────────────────────┤
│                          │
│      NỘI DUNG TRANG      │
│                          │
├──────────────────────────┤
│ 🏠     📚     ✍     👤    │
│ Nhà   Bài   Viết  Tôi    │
└──────────────────────────┘
```

Bottom navigation chỉ hiện với thành viên; khách thấy nút Đăng nhập/Đăng ký trong menu.

## 3. Trang chủ

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Chia sẻ kinh nghiệm – Cùng nhau canh tác tốt hơn                        │ │
│ │ Kết nối tri thức từ những mùa vụ thực tế.        [Khám phá] [Viết bài]   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Danh mục nổi bật: [Trồng trọt] [Sâu bệnh] [Dinh dưỡng] [Tưới tiêu]          │
│                                                                              │
│ Bài viết mới                                      Nhà nông nổi bật           │
│ ┌──────────────┐ ┌──────────────┐                 ┌─────────────────────┐    │
│ │ Ảnh          │ │ Ảnh          │                 │ avatar Tên · cây    │    │
│ │ Tiêu đề      │ │ Tiêu đề      │                 │ avatar Tên · cây    │    │
│ │ tác giả ♥ 💬 │ │ tác giả ♥ 💬 │                 │ avatar Tên · cây    │    │
│ └──────────────┘ └──────────────┘                 └─────────────────────┘    │
│ [Xem thêm bài viết]                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Mobile: hero rút gọn; danh mục cuộn ngang; bài viết một cột; danh sách nhà nông chuyển xuống cuối.

## 4. Đăng nhập

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                 ┌──────────────────────────────────────┐                     │
│                 │ Chào mừng trở lại                   │                     │
│                 │ Email      [____________________]    │                     │
│                 │ Mật khẩu   [________________] [👁]   │                     │
│                 │ [ ] Ghi nhớ       Quên mật khẩu?     │                     │
│                 │ [          ĐĂNG NHẬP           ]     │                     │
│                 │ Chưa có tài khoản? Đăng ký           │                     │
│                 └──────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Lỗi hiển thị dưới đúng trường và có thông báo tổng quát cho lỗi credential, tránh tiết lộ email tồn tại.

## 5. Đăng ký

```text
┌──────────────────────────────────────────┐
│ Tạo tài khoản                            │
│ Họ và tên       [____________________]   │
│ Email            [____________________]  │
│ Mật khẩu         [________________] [👁] │
│ Xác nhận mật khẩu[________________] [👁] │
│ ✓ 8+ ký tự  ✓ chữ và số                  │
│ [ ] Tôi đồng ý điều khoản                │
│ [             ĐĂNG KÝ              ]     │
│ Đã có tài khoản? Đăng nhập               │
└──────────────────────────────────────────┘
```

Tablet/desktop giữ form hẹp để dễ đọc; mobile dùng toàn chiều rộng với padding 16 px.

## 6. Danh sách blog

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Bài viết chia sẻ kỹ thuật                              [ + Viết bài ]        │
│ [Từ khóa................] [Danh mục ▾] [Cây trồng ▾] [Tác giả...] [Lọc]     │
│ [Mới nhất ▾]                                         128 kết quả             │
├───────────────────────────────────────────────────┬──────────────────────────┤
│ ┌────────────┬──────────────────────────────────┐  │ Danh mục                 │
│ │ Ảnh        │ Danh mục · Cây trồng            │  │ ○ Tất cả                 │
│ │            │ Tiêu đề bài viết                │  │ ○ Kỹ thuật trồng trọt    │
│ │            │ Mô tả ngắn...                   │  │ ○ Phòng trừ sâu bệnh     │
│ │            │ avatar Tác giả · ngày · ♥ · 💬  │  │ ...                      │
│ └────────────┴──────────────────────────────────┘  │                          │
│ (các card tiếp theo)                               │                          │
│                 [‹] [1] [2] [3] [›]               │                          │
└───────────────────────────────────────────────────┴──────────────────────────┘
```

Mobile: nút “Bộ lọc” mở bottom sheet; card chuyển thành ảnh trên, nội dung dưới; phân trang dùng “Xem thêm” hoặc nút lớn dễ chạm.

## 7. Chi tiết blog

```text
┌────────────────────────────────────────────────────┬─────────────────────────┐
│ [Danh mục] [Cây trồng]                             │ Về tác giả              │
│ TIÊU ĐỀ BÀI VIẾT                                   │ avatar Tên              │
│ avatar Tác giả · 12/06/20xx · 8 phút đọc           │ Cây trồng · kinh nghiệm │
│ [Theo dõi]                          [⋯ nếu sở hữu]  │ [Xem hồ sơ] [Theo dõi]  │
│ ┌────────────────────────────────────────────────┐ │                         │
│ │ Ảnh bìa / gallery                              │ │ Bài liên quan           │
│ └────────────────────────────────────────────────┘ │ - Tiêu đề...             │
│ Nội dung rich text...                              │ - Tiêu đề...             │
│                                                    │                         │
│ [♥ Thích 24] [💬 8 bình luận] [Chia sẻ liên kết]  │                         │
│ ─────────────────────────────────────────────────  │                         │
│ Bình luận                                          │                         │
│ [avatar] [Viết bình luận................] [Gửi]    │                         │
│ [avatar] Tên · nội dung                 [Trả lời]  │                         │
│     [avatar] Câu trả lời...                        │                         │
└────────────────────────────────────────────────────┴─────────────────────────┘
```

Mobile: bỏ sidebar; khối tác giả đặt sau nội dung; thanh like/comment có thể sticky phía dưới nhưng không che nội dung.

## 8. Viết / chỉnh sửa blog

Hai trang dùng chung `PostEditorPage`; chế độ sửa nạp dữ liệu hiện có và kiểm tra ownership.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Viết bài chia sẻ                         Đã tự lưu 10:30  [Lưu nháp] [Đăng]  │
├───────────────────────────────────────────────────────┬──────────────────────┤
│ Tiêu đề [__________________________________________]  │ Thiết lập             │
│                                                       │ Danh mục [________ ▾] │
│ [H1] [B] [I] [List] [Link] [Quote] [Undo]            │ Cây trồng[__________] │
│ ┌───────────────────────────────────────────────────┐ │ Ảnh                   │
│ │ Nội dung rich text...                            │ │ [+ Thêm ảnh]          │
│ │                                                   │ │ [img][img][img] ↕     │
│ └───────────────────────────────────────────────────┘ │                      │
│ Mô tả ngắn [_____________________________________]   │ [Xem trước]            │
└───────────────────────────────────────────────────────┴──────────────────────┘
```

Mobile: thiết lập nằm trong accordion dưới tiêu đề; action bar Lưu nháp/Đăng sticky; upload hiển thị tiến độ từng ảnh và nút thử lại.

## 9. Trang cá nhân

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────── ẢNH BÌA ─────────────────────────────────────┐ │
│ │     (avatar) TÊN NHÀ NÔNG                  [Theo dõi] / [Sửa hồ sơ]      │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ Cây trồng chính · Địa chỉ · N năm kinh nghiệm                               │
│ Giới thiệu...                                                                │
│ 24 Bài viết     320 Người theo dõi     80 Đang theo dõi                     │
│ [Bài viết] [Giới thiệu]                                                      │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                                 │
│ │ Post card  │ │ Post card  │ │ Post card  │                                 │
│ └────────────┘ └────────────┘ └────────────┘                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

Form sửa hồ sơ dùng modal trên desktop và full-screen sheet trên mobile; avatar/cover có crop preview.

## 10. Danh sách người dùng / nhà nông

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Khám phá nhà nông                                                            │
│ [Tên tác giả........] [Cây trồng........] [Địa chỉ........] [Tìm]           │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐         │
│ │ avatar Tên         │ │ avatar Tên         │ │ avatar Tên         │         │
│ │ Cây · N năm        │ │ Cây · N năm        │ │ Cây · N năm        │         │
│ │ 20 bài · 50 follow │ │ 12 bài · 30 follow │ │ 40 bài · 90 follow │         │
│ │ [Xem] [Theo dõi]   │ │ [Xem] [Theo dõi]   │ │ [Xem] [Theo dõi]   │         │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────┘
```

Desktop 3 cột, tablet 2 cột, mobile 1 cột. Đây là trang cộng đồng; quản lý user của admin là màn hình riêng.

## 11. Thông báo

```text
┌──────────────────────────────────────────────────────────────┐
│ Thông báo                     [Đánh dấu tất cả đã đọc]       │
│ [Tất cả] [Chưa đọc]                                          │
├──────────────────────────────────────────────────────────────┤
│ ● avatar An đã thích bài “Cách ủ phân...”      2 phút trước  │
│ ● avatar Bình đã bình luận bài của bạn          1 giờ trước  │
│   avatar Chi bắt đầu theo dõi bạn                hôm qua      │
│                       [Xem thêm]                              │
└──────────────────────────────────────────────────────────────┘
```

Chấm `●` đi cùng nền và nhãn accessible; bấm notification điều hướng đến đúng bài/comment/hồ sơ và đánh dấu đã đọc.

## 12. Dashboard Admin

```text
┌───────────────┬──────────────────────────────────────────────────────────────┐
│ ADMIN         │ Dashboard                                                    │
│ ▣ Tổng quan   │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│ ♟ Người dùng  │ │ Users  │ │ Posts  │ │Comments│ │ Likes  │                 │
│ ▤ Bài viết    │ │ 1,250  │ │ 3,400  │ │ 8,210  │ │ 25,100 │                 │
│ 💬 Bình luận  │ └────────┘ └────────┘ └────────┘ └────────┘                 │
│ ◫ Danh mục    │                                                              │
│               │ Hoạt động 7 ngày [biểu đồ đường/cột]                         │
│               │                                                              │
│               │ Nội dung gần đây cần xử lý                                   │
│               │ [Loại] [Tác giả] [Trạng thái] [Ngày] [Hành động]            │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

### Quản lý người dùng

```text
[Tìm email/tên] [Trạng thái ▾] [Vai trò ▾]
┌──────────┬─────────────┬────────┬───────────┬────────────┬──────────┐
│ User     │ Email       │ Role   │ Trạng thái│ Ngày tạo   │ Thao tác │
│ avatar A │ a@...       │ MEMBER │ ACTIVE    │ ...        │ [⋯]      │
└──────────┴─────────────┴────────┴───────────┴────────────┴──────────┘
```

Menu thao tác gồm xem, khóa/mở khóa; hành động nguy hiểm có confirm và bắt nhập lý do. Quản lý bài, bình luận và danh mục dùng cùng mẫu bảng/filter. Trên tablet/mobile, sidebar thành drawer và mỗi hàng bảng thành card có nhãn.

## 13. Trạng thái bắt buộc của mọi màn hình

- Loading: skeleton giữ ổn định layout.
- Empty: thông điệp có ngữ cảnh và CTA phù hợp.
- Error: thông báo dễ hiểu, nút thử lại; không lộ stack trace.
- Unauthorized/Forbidden: phân biệt 401 cần đăng nhập và 403 không đủ quyền.
- Offline hoặc upload lỗi: giữ nội dung người dùng đã nhập trong khả năng hợp lý.
- Confirm khi rời editor có thay đổi chưa lưu.

## 14. Responsive và accessibility checklist

- Target tương tác tối thiểu khoảng 44 × 44 px; focus ring rõ ràng.
- Form có `label`, lỗi liên kết bằng thuộc tính hỗ trợ đọc màn hình.
- Heading đúng cấp; ảnh nội dung có alt text; avatar trang trí dùng alt rỗng khi tên đã kế bên.
- Tương phản chữ/nền đạt chuẩn thông dụng; không dùng màu đơn độc để báo lỗi.
- Editor, modal, drawer và menu dùng được bằng bàn phím, quản lý focus đúng.
- Ảnh dùng `srcset`, lazy loading và tỷ lệ cố định để giảm layout shift.
