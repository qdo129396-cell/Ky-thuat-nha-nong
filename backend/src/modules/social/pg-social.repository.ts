import type pg from "pg";
import type { PostSocialStats } from "../posts/post.types.js";
import type {
  BlogComment,
  CommentStatus,
  ListCommentsInput,
  PaginatedComments,
  PublishedPostReference,
  SocialRepository,
  SocialUser
} from "./social.types.js";

interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  status: CommentStatus;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  author_id: string;
  author_full_name: string;
  author_slug: string;
  author_avatar_key: string | null;
}

interface CountRow {
  count: number | string;
}

interface PostStatsRow {
  id: string;
  like_count: number | string;
  comment_count: number | string;
  viewer_has_liked: boolean;
  follower_count: number | string;
  viewer_is_following: boolean;
}

const commentColumns = `
  c.id,
  c.post_id,
  c.parent_id,
  c.body,
  c.status,
  c.deleted_at,
  c.created_at,
  c.updated_at,
  u.id AS author_id,
  u.full_name AS author_full_name,
  u.slug AS author_slug,
  avatar.storage_key AS author_avatar_key
`;

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapComment(row: CommentRow): BlogComment {
  const isDeleted = row.status === "DELETED" || row.deleted_at !== null;
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    body: isDeleted ? "Bình luận này đã bị xóa." : row.body,
    status: row.status,
    isDeleted,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    author: {
      id: row.author_id,
      fullName: row.author_full_name,
      slug: row.author_slug,
      avatarUrl: row.author_avatar_key ? `/uploads/${row.author_avatar_key}` : null
    },
    canEdit: false,
    canDelete: false,
    replies: []
  };
}

export class PgSocialRepository implements SocialRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findUserById(userId: string): Promise<SocialUser | null> {
    const result = await this.pool.query<SocialUser>(
      "SELECT id, status FROM users WHERE id = $1",
      [userId]
    );
    return result.rows[0] ?? null;
  }

  async findPublishedPost(postId: string): Promise<PublishedPostReference | null> {
    const result = await this.pool.query<{ id: string; author_id: string }>(
      `SELECT id, author_id
       FROM posts
       WHERE id = $1 AND status = 'PUBLISHED' AND deleted_at IS NULL`,
      [postId]
    );
    const row = result.rows[0];
    return row ? { id: row.id, authorId: row.author_id } : null;
  }

  async getPostSocialStats(postIds: string[], viewerId: string | null): Promise<Map<string, PostSocialStats>> {
    if (!postIds.length) return new Map();
    const result = await this.pool.query<PostStatsRow>(
      `SELECT
         p.id,
         (SELECT count(*)::int FROM likes l WHERE l.post_id = p.id) AS like_count,
         (
           SELECT count(*)::int
           FROM comments cm
           WHERE cm.post_id = p.id AND cm.status = 'VISIBLE' AND cm.deleted_at IS NULL
         ) AS comment_count,
         EXISTS(
           SELECT 1 FROM likes viewer_like
           WHERE viewer_like.post_id = p.id AND viewer_like.user_id = $2::uuid
         ) AS viewer_has_liked,
         (SELECT count(*)::int FROM followers f WHERE f.following_id = p.author_id) AS follower_count,
         EXISTS(
           SELECT 1 FROM followers viewer_follow
           WHERE viewer_follow.following_id = p.author_id AND viewer_follow.follower_id = $2::uuid
         ) AS viewer_is_following
       FROM posts p
       WHERE p.id = ANY($1::uuid[])`,
      [postIds, viewerId]
    );
    const stats = new Map<string, PostSocialStats>();
    for (const row of result.rows) {
      stats.set(row.id, {
        likeCount: Number(row.like_count),
        commentCount: Number(row.comment_count),
        viewerHasLiked: row.viewer_has_liked,
        followerCount: Number(row.follower_count),
        viewerIsFollowing: row.viewer_is_following
      });
    }
    return stats;
  }

  async setPostLike(postId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `INSERT INTO likes(post_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING
       RETURNING id`,
      [postId, userId]
    );
    return Boolean(result.rowCount);
  }

  async removePostLike(postId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM likes WHERE post_id = $1 AND user_id = $2 RETURNING id",
      [postId, userId]
    );
    return Boolean(result.rowCount);
  }

  async countPostLikes(postId: string): Promise<number> {
    const result = await this.pool.query<CountRow>(
      "SELECT count(*)::int AS count FROM likes WHERE post_id = $1",
      [postId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listComments(postId: string, input: ListCommentsInput): Promise<PaginatedComments> {
    const rootVisibility = `
      (
        (c.status = 'VISIBLE' AND c.deleted_at IS NULL)
        OR (
          c.status = 'DELETED' AND c.deleted_at IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM comments reply
            WHERE reply.parent_id = c.id
              AND reply.status = 'VISIBLE'
              AND reply.deleted_at IS NULL
          )
        )
      )`;
    const [countResult, rootResult] = await Promise.all([
      this.pool.query<CountRow>(
        `SELECT count(*)::int AS count
         FROM comments c
         WHERE c.post_id = $1 AND c.parent_id IS NULL AND ${rootVisibility}`,
        [postId]
      ),
      this.pool.query<CommentRow>(
        `SELECT ${commentColumns}
         FROM comments c
         JOIN users u ON u.id = c.author_id
         LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
         WHERE c.post_id = $1 AND c.parent_id IS NULL AND ${rootVisibility}
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [postId, input.limit, (input.page - 1) * input.limit]
      )
    ]);
    const items = rootResult.rows.map(mapComment);
    if (items.length) {
      const replies = await this.pool.query<CommentRow>(
        `SELECT ${commentColumns}
         FROM comments c
         JOIN users u ON u.id = c.author_id
         LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
         WHERE c.parent_id = ANY($1::uuid[])
           AND c.status = 'VISIBLE'
           AND c.deleted_at IS NULL
         ORDER BY c.created_at ASC`,
        [items.map((item) => item.id)]
      );
      const byId = new Map(items.map((item) => [item.id, item]));
      for (const row of replies.rows) {
        const reply = mapComment(row);
        if (reply.parentId) byId.get(reply.parentId)?.replies.push(reply);
      }
    }
    const totalItems = Number(countResult.rows[0]?.count ?? 0);
    return {
      items,
      meta: {
        page: input.page,
        limit: input.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.limit))
      }
    };
  }

  async findCommentById(commentId: string): Promise<BlogComment | null> {
    const result = await this.pool.query<CommentRow>(
      `SELECT ${commentColumns}
       FROM comments c
       JOIN users u ON u.id = c.author_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
       WHERE c.id = $1`,
      [commentId]
    );
    return result.rows[0] ? mapComment(result.rows[0]) : null;
  }

  async createComment(input: {
    postId: string;
    authorId: string;
    parentId: string | null;
    body: string;
  }): Promise<BlogComment> {
    const result = await this.pool.query<CommentRow>(
      `WITH inserted AS (
         INSERT INTO comments(post_id, author_id, parent_id, body)
         VALUES ($1, $2, $3, $4)
         RETURNING *
       )
       SELECT ${commentColumns}
       FROM inserted c
       JOIN users u ON u.id = c.author_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id`,
      [input.postId, input.authorId, input.parentId, input.body]
    );
    const row = result.rows[0];
    if (!row) throw new Error("COMMENT_CREATE_FAILED");
    return mapComment(row);
  }

  async updateComment(commentId: string, body: string): Promise<BlogComment | null> {
    const result = await this.pool.query<CommentRow>(
      `WITH updated AS (
         UPDATE comments
         SET body = $2
         WHERE id = $1 AND status = 'VISIBLE' AND deleted_at IS NULL
         RETURNING *
       )
       SELECT ${commentColumns}
       FROM updated c
       JOIN users u ON u.id = c.author_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id`,
      [commentId, body]
    );
    return result.rows[0] ? mapComment(result.rows[0]) : null;
  }

  async softDeleteComment(commentId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE comments
       SET status = 'DELETED', deleted_at = NOW()
       WHERE id = $1 AND status = 'VISIBLE' AND deleted_at IS NULL
       RETURNING id`,
      [commentId]
    );
    return Boolean(result.rowCount);
  }

  async setFollow(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.pool.query(
      `INSERT INTO followers(follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING id`,
      [followerId, followingId]
    );
    return Boolean(result.rowCount);
  }

  async removeFollow(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM followers WHERE follower_id = $1 AND following_id = $2 RETURNING id",
      [followerId, followingId]
    );
    return Boolean(result.rowCount);
  }

  async countFollowers(userId: string): Promise<number> {
    const result = await this.pool.query<CountRow>(
      "SELECT count(*)::int AS count FROM followers WHERE following_id = $1",
      [userId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}
