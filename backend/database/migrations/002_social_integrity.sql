BEGIN;

-- Enforce that a reply's parent belongs to the same post. Application logic
-- also limits discussion to one reply level; this constraint protects the
-- cross-post invariant even for direct database writes.
ALTER TABLE comments
  ADD CONSTRAINT comments_id_post_unique UNIQUE (id, post_id);

ALTER TABLE comments
  ADD CONSTRAINT comments_parent_same_post_fkey
  FOREIGN KEY (parent_id, post_id)
  REFERENCES comments (id, post_id)
  ON DELETE RESTRICT;

CREATE INDEX comments_visible_root_post_created_at_idx
  ON comments (post_id, created_at DESC)
  WHERE status = 'VISIBLE' AND deleted_at IS NULL AND parent_id IS NULL;

CREATE INDEX comments_visible_reply_parent_created_at_idx
  ON comments (parent_id, created_at ASC)
  WHERE status = 'VISIBLE' AND deleted_at IS NULL;

CREATE INDEX likes_post_created_at_idx ON likes (post_id, created_at DESC);
CREATE INDEX followers_follower_created_at_idx ON followers (follower_id, created_at DESC);

COMMIT;
