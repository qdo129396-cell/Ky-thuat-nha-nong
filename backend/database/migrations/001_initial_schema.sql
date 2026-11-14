BEGIN;

CREATE TYPE user_status AS ENUM ('ACTIVE', 'BLOCKED');
CREATE TYPE post_status AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'DELETED');
CREATE TYPE image_purpose AS ENUM ('POST', 'AVATAR', 'COVER');
CREATE TYPE comment_status AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');
CREATE TYPE notification_type AS ENUM (
  'POST_LIKED',
  'POST_COMMENTED',
  'COMMENT_REPLIED',
  'USER_FOLLOWED'
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(30) NOT NULL UNIQUE,
  description varchar(255),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  full_name varchar(100) NOT NULL,
  slug varchar(120) NOT NULL UNIQUE,
  bio text,
  address varchar(255),
  phone varchar(20),
  main_crop varchar(100),
  experience_years smallint,
  status user_status NOT NULL DEFAULT 'ACTIVE',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT users_full_name_not_blank CHECK (length(btrim(full_name)) >= 2),
  CONSTRAINT users_experience_years_range CHECK (
    experience_years IS NULL OR experience_years BETWEEN 0 AND 100
  )
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name varchar(100) NOT NULL UNIQUE,
  slug varchar(120) NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title varchar(200) NOT NULL,
  slug varchar(240) NOT NULL UNIQUE,
  crop_name varchar(100),
  excerpt varchar(500),
  content_html text NOT NULL DEFAULT '',
  content_text text NOT NULL DEFAULT '',
  status post_status NOT NULL DEFAULT 'DRAFT',
  view_count bigint NOT NULL DEFAULT 0,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT posts_title_not_blank CHECK (length(btrim(title)) >= 10),
  CONSTRAINT posts_view_count_non_negative CHECK (view_count >= 0),
  CONSTRAINT posts_published_at_required CHECK (
    status <> 'PUBLISHED' OR published_at IS NOT NULL
  )
);

CREATE TABLE images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  purpose image_purpose NOT NULL,
  storage_key varchar(500) NOT NULL UNIQUE,
  original_name varchar(255) NOT NULL,
  mime_type varchar(50) NOT NULL,
  size_bytes bigint NOT NULL,
  width integer,
  height integer,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT images_allowed_mime CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT images_size_range CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  CONSTRAINT images_dimensions_positive CHECK (
    (width IS NULL OR width > 0) AND (height IS NULL OR height > 0)
  ),
  CONSTRAINT images_sort_order_non_negative CHECK (sort_order >= 0)
);

ALTER TABLE users
  ADD COLUMN avatar_image_id uuid REFERENCES images(id) ON DELETE SET NULL,
  ADD COLUMN cover_image_id uuid REFERENCES images(id) ON DELETE SET NULL;

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_id uuid REFERENCES comments(id) ON DELETE RESTRICT,
  body text NOT NULL,
  status comment_status NOT NULL DEFAULT 'VISIBLE',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT comments_body_length CHECK (length(btrim(body)) BETWEEN 1 AND 2000)
);

CREATE TABLE likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT likes_post_user_unique UNIQUE (post_id, user_id)
);

CREATE TABLE followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT followers_pair_unique UNIQUE (follower_id, following_id),
  CONSTRAINT followers_not_self CHECK (follower_id <> following_id)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  comment_id uuid REFERENCES comments(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  is_read boolean NOT NULL DEFAULT FALSE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_read_state CHECK (
    (is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE AND read_at IS NOT NULL)
  )
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  token_hash varchar(64) NOT NULL UNIQUE,
  jti varchar(100) NOT NULL UNIQUE,
  user_agent varchar(500),
  ip_address varchar(45),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action varchar(100) NOT NULL,
  target_type varchar(50) NOT NULL,
  target_id uuid NOT NULL,
  metadata jsonb,
  ip_address varchar(45),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX users_status_created_at_idx ON users(status, created_at DESC);
CREATE UNIQUE INDEX users_email_lower_unique ON users(lower(email));
CREATE INDEX posts_status_published_at_idx ON posts(status, published_at DESC);
CREATE INDEX posts_author_status_idx ON posts(author_id, status);
CREATE INDEX posts_category_idx ON posts(category_id);
CREATE INDEX posts_crop_name_idx ON posts(lower(crop_name));
CREATE INDEX comments_post_created_at_idx ON comments(post_id, created_at);
CREATE INDEX comments_author_idx ON comments(author_id);
CREATE INDEX comments_parent_idx ON comments(parent_id);
CREATE INDEX likes_user_idx ON likes(user_id);
CREATE INDEX followers_following_created_at_idx ON followers(following_id, created_at DESC);
CREATE INDEX notifications_recipient_unread_idx ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX images_post_order_idx ON images(post_id, sort_order);
CREATE INDEX images_uploader_idx ON images(uploader_id);
CREATE INDEX refresh_tokens_user_active_idx ON refresh_tokens(user_id, revoked_at, expires_at);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens(family_id);
CREATE INDEX password_reset_tokens_user_idx ON password_reset_tokens(user_id, expires_at);
CREATE INDEX audit_logs_actor_created_at_idx ON audit_logs(actor_id, created_at DESC);
CREATE INDEX audit_logs_target_idx ON audit_logs(target_type, target_id);

CREATE TRIGGER roles_set_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER images_set_updated_at BEFORE UPDATE ON images FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER comments_set_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER likes_set_updated_at BEFORE UPDATE ON likes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER followers_set_updated_at BEFORE UPDATE ON followers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notifications_set_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER refresh_tokens_set_updated_at BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER password_reset_tokens_set_updated_at BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audit_logs_set_updated_at BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
