INSERT INTO roles (name, description)
VALUES
  ('ADMIN', 'Quản trị toàn hệ thống'),
  ('MEMBER', 'Thành viên cộng đồng')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO categories (name, slug, description)
VALUES
  ('Kỹ thuật trồng trọt', 'ky-thuat-trong-trot', 'Kỹ thuật gieo trồng và chăm sóc cây'),
  ('Phòng trừ sâu bệnh', 'phong-tru-sau-benh', 'Nhận biết và xử lý sâu bệnh'),
  ('Đất và dinh dưỡng', 'dat-va-dinh-duong', 'Đất, phân bón và dinh dưỡng cây trồng'),
  ('Tưới tiêu', 'tuoi-tieu', 'Giải pháp tưới và quản lý nguồn nước'),
  ('Thu hoạch và bảo quản', 'thu-hoach-va-bao-quan', 'Thu hoạch, sơ chế và bảo quản'),
  ('Nhật ký mùa vụ', 'nhat-ky-mua-vu', 'Kinh nghiệm thực tế qua từng mùa vụ')
ON CONFLICT (name) DO UPDATE SET
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  is_active = TRUE;

