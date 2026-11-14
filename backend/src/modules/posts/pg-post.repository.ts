import type pg from "pg";
import { AppError } from "../../common/errors/app-error.js";
import type {
  BlogCategory,
  BlogPost,
  ListPostsInput,
  PaginatedPosts,
  PostRepository,
  PreparedPostInput
} from "./post.types.js";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface PostRow {
  id: string;
  title: string;
  slug: string;
  crop_name: string | null;
  excerpt: string;
  content_html: string;
  content_text: string;
  status: "DRAFT" | "PUBLISHED";
  view_count: string | number;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_description: string | null;
  author_id: string;
  author_full_name: string;
  author_slug: string;
  author_avatar_key: string | null;
}

const postColumns = `
  p.id,
  p.title,
  p.slug,
  p.crop_name,
  p.excerpt,
  p.content_html,
  p.content_text,
  p.status,
  p.view_count,
  p.published_at,
  p.created_at,
  p.updated_at,
  c.id AS category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.description AS category_description,
  u.id AS author_id,
  u.full_name AS author_full_name,
  u.slug AS author_slug,
  avatar.storage_key AS author_avatar_key
`;

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapCategory(row: CategoryRow): BlogCategory {
  return { id: row.id, name: row.name, slug: row.slug, description: row.description };
}

function mapPost(row: PostRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    cropName: row.crop_name,
    excerpt: row.excerpt,
    contentHtml: row.content_html,
    contentText: row.content_text,
    status: row.status,
    viewCount: Number(row.view_count),
    publishedAt: row.published_at ? toIso(row.published_at) : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      description: row.category_description
    },
    author: {
      id: row.author_id,
      fullName: row.author_full_name,
      slug: row.author_slug,
      avatarUrl: row.author_avatar_key ? `/uploads/${row.author_avatar_key}` : null,
      followerCount: 0,
      viewerIsFollowing: false
    },
    likeCount: 0,
    commentCount: 0,
    viewerHasLiked: false,
    canEdit: false
  };
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

interface Filters {
  clauses: string[];
  values: unknown[];
}

function addFilters(input: ListPostsInput, startAt: number): Filters {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const add = (value: unknown): string => {
    values.push(value);
    return `$${startAt + values.length - 1}`;
  };

  if (input.query) {
    const query = add(`%${input.query}%`);
    clauses.push(`(p.title ILIKE ${query} OR p.excerpt ILIKE ${query} OR p.content_text ILIKE ${query} OR COALESCE(p.crop_name, '') ILIKE ${query})`);
  }
  if (input.categorySlug) clauses.push(`c.slug = ${add(input.categorySlug)}`);
  if (input.cropName) clauses.push(`LOWER(COALESCE(p.crop_name, '')) = LOWER(${add(input.cropName)})`);
  return { clauses, values };
}

function orderBy(input: ListPostsInput, ownPosts: boolean): string {
  if (input.sort === "popular") return "p.view_count DESC, p.published_at DESC NULLS LAST, p.created_at DESC";
  if (ownPosts) return "p.updated_at DESC";
  return "p.published_at DESC NULLS LAST, p.created_at DESC";
}

export class PgPostRepository implements PostRepository {
  constructor(private readonly pool: pg.Pool) {}

  async listCategories(): Promise<BlogCategory[]> {
    const result = await this.pool.query<CategoryRow>(
      `SELECT id, name, slug, description
       FROM categories
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );
    return result.rows.map(mapCategory);
  }

  async findActiveCategoryById(categoryId: string): Promise<BlogCategory | null> {
    const result = await this.pool.query<CategoryRow>(
      `SELECT id, name, slug, description
       FROM categories
       WHERE id = $1 AND is_active = TRUE`,
      [categoryId]
    );
    return result.rows[0] ? mapCategory(result.rows[0]) : null;
  }

  async listPublished(input: ListPostsInput): Promise<PaginatedPosts> {
    const filters = addFilters(input, 1);
    const clauses = ["p.status = 'PUBLISHED'", "p.deleted_at IS NULL", ...filters.clauses];
    return this.listWithFilters(input, clauses, filters.values, false);
  }

  async listByAuthor(authorId: string, input: ListPostsInput): Promise<PaginatedPosts> {
    const filters = addFilters(input, 2);
    const clauses = ["p.author_id = $1", "p.deleted_at IS NULL", ...filters.clauses];
    return this.listWithFilters(input, clauses, [authorId, ...filters.values], true);
  }

  async findPublishedBySlug(slug: string): Promise<BlogPost | null> {
    const result = await this.pool.query<PostRow>(
      `SELECT ${postColumns}
       FROM posts p
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.author_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
       WHERE p.slug = $1 AND p.status = 'PUBLISHED' AND p.deleted_at IS NULL`,
      [slug]
    );
    return result.rows[0] ? mapPost(result.rows[0]) : null;
  }

  async findById(postId: string): Promise<BlogPost | null> {
    const result = await this.pool.query<PostRow>(
      `SELECT ${postColumns}
       FROM posts p
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.author_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [postId]
    );
    return result.rows[0] ? mapPost(result.rows[0]) : null;
  }

  async create(authorId: string, input: PreparedPostInput): Promise<BlogPost> {
    try {
      const result = await this.pool.query<PostRow>(
        `WITH inserted AS (
           INSERT INTO posts(
             author_id, category_id, title, slug, crop_name, excerpt, content_html, content_text, status, published_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9::post_status,
             CASE WHEN $9::post_status = 'PUBLISHED' THEN NOW() ELSE NULL END
           )
           RETURNING *
         )
         SELECT
           inserted.id,
           inserted.title,
           inserted.slug,
           inserted.crop_name,
           inserted.excerpt,
           inserted.content_html,
           inserted.content_text,
           inserted.status,
           inserted.view_count,
           inserted.published_at,
           inserted.created_at,
           inserted.updated_at,
           c.id AS category_id,
           c.name AS category_name,
           c.slug AS category_slug,
           c.description AS category_description,
           u.id AS author_id,
           u.full_name AS author_full_name,
           u.slug AS author_slug,
           avatar.storage_key AS author_avatar_key
         FROM inserted
         JOIN categories c ON c.id = inserted.category_id
         JOIN users u ON u.id = inserted.author_id
         LEFT JOIN images avatar ON avatar.id = u.avatar_image_id`,
        [
          authorId,
          input.categoryId,
          input.title,
          input.slug,
          input.cropName,
          input.excerpt,
          input.contentHtml,
          input.contentText,
          input.status
        ]
      );
      const row = result.rows[0];
      if (!row) throw new AppError(500, "POST_CREATE_FAILED", "Không thể tạo bài viết.");
      return mapPost(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "POST_SLUG_ALREADY_EXISTS", "Đường dẫn bài viết đã tồn tại. Vui lòng thử lại.");
      }
      throw error;
    }
  }

  async update(postId: string, input: PreparedPostInput): Promise<BlogPost | null> {
    const result = await this.pool.query<PostRow>(
      `WITH updated AS (
         UPDATE posts
         SET
           category_id = $2,
           title = $3,
           crop_name = $4,
           excerpt = $5,
           content_html = $6,
           content_text = $7,
           status = $8::post_status,
           published_at = CASE
             WHEN $8::post_status = 'PUBLISHED' THEN COALESCE(published_at, NOW())
             ELSE NULL
           END
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *
       )
       SELECT
         updated.id,
         updated.title,
         updated.slug,
         updated.crop_name,
         updated.excerpt,
         updated.content_html,
         updated.content_text,
         updated.status,
         updated.view_count,
         updated.published_at,
         updated.created_at,
         updated.updated_at,
         c.id AS category_id,
         c.name AS category_name,
         c.slug AS category_slug,
         c.description AS category_description,
         u.id AS author_id,
         u.full_name AS author_full_name,
         u.slug AS author_slug,
         avatar.storage_key AS author_avatar_key
       FROM updated
       JOIN categories c ON c.id = updated.category_id
       JOIN users u ON u.id = updated.author_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id`,
      [
        postId,
        input.categoryId,
        input.title,
        input.cropName,
        input.excerpt,
        input.contentHtml,
        input.contentText,
        input.status
      ]
    );
    return result.rows[0] ? mapPost(result.rows[0]) : null;
  }

  async softDelete(postId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE posts
       SET status = 'DELETED', deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [postId]
    );
    return Boolean(result.rowCount);
  }

  private async listWithFilters(
    input: ListPostsInput,
    clauses: string[],
    values: unknown[],
    ownPosts: boolean
  ): Promise<PaginatedPosts> {
    const where = clauses.join(" AND ");
    const countResult = await this.pool.query<{ total: string }>(
      `SELECT count(*)::text AS total
       FROM posts p
       JOIN categories c ON c.id = p.category_id
       WHERE ${where}`,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const limitPlaceholder = `$${values.length + 1}`;
    const offsetPlaceholder = `$${values.length + 2}`;
    const result = await this.pool.query<PostRow>(
      `SELECT ${postColumns}
       FROM posts p
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.author_id
       LEFT JOIN images avatar ON avatar.id = u.avatar_image_id
       WHERE ${where}
       ORDER BY ${orderBy(input, ownPosts)}
       LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      [...values, input.limit, (input.page - 1) * input.limit]
    );
    return {
      items: result.rows.map(mapPost),
      meta: {
        page: input.page,
        limit: input.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.limit))
      }
    };
  }
}
