import sanitizeHtml from "sanitize-html";
import { randomUUID } from "node:crypto";
import { AppError } from "../../common/errors/app-error.js";
import { toSlug } from "../../common/utils.js";
import type {
  BlogPost,
  ListPostsInput,
  PaginatedPosts,
  PostRepository,
  PostSocialStats,
  PostSocialStatsReader,
  PreparedPostInput,
  WritePostInput
} from "./post.types.js";

const allowedTags = [
  "p", "br", "h2", "h3", "blockquote", "ul", "ol", "li", "strong", "b", "em", "i", "a", "code", "pre"
];

function cleanContent(contentHtml: string, requireContent: boolean): { contentHtml: string; contentText: string } {
  const safeHtml = sanitizeHtml(contentHtml, {
    allowedTags,
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { a: ["http", "https", "mailto"] },
    disallowedTagsMode: "discard"
  }).trim();
  const contentText = sanitizeHtml(safeHtml, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();

  if (requireContent && contentText.length < 20) {
    throw new AppError(400, "POST_CONTENT_TOO_SHORT", "Nội dung bài viết cần có ít nhất 20 ký tự.");
  }
  return { contentHtml: safeHtml, contentText };
}

function prepareInput(input: WritePostInput, includeSlug: boolean): PreparedPostInput {
  const content = cleanContent(input.contentHtml, input.status === "PUBLISHED");
  const excerpt = input.excerpt?.trim() || (content.contentText
    ? `${content.contentText.slice(0, 220)}${content.contentText.length > 220 ? "…" : ""}`
    : "");
  const prepared: PreparedPostInput = {
    title: input.title.trim(),
    categoryId: input.categoryId,
    cropName: input.cropName?.trim() || null,
    excerpt,
    contentHtml: content.contentHtml,
    contentText: content.contentText,
    status: input.status
  };
  if (includeSlug) {
    const baseSlug = toSlug(input.title).slice(0, 220) || "bai-viet";
    prepared.slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
  }
  return prepared;
}

function markPermission(post: BlogPost, userId: string | null): BlogPost {
  return { ...post, canEdit: post.author.id === userId };
}

function applySocialStats(post: BlogPost, stats: PostSocialStats | undefined): BlogPost {
  if (!stats) return post;
  return {
    ...post,
    likeCount: stats.likeCount,
    commentCount: stats.commentCount,
    viewerHasLiked: stats.viewerHasLiked,
    author: {
      ...post.author,
      followerCount: stats.followerCount,
      viewerIsFollowing: stats.viewerIsFollowing
    }
  };
}

export class PostService {
  constructor(
    private readonly repository: PostRepository,
    private readonly socialStatsReader?: PostSocialStatsReader
  ) {}

  listCategories() {
    return this.repository.listCategories();
  }

  async listPublished(input: ListPostsInput, userId: string | null = null): Promise<PaginatedPosts> {
    const result = await this.repository.listPublished(input);
    return { ...result, items: await this.enrichPosts(result.items, userId) };
  }

  async getPublishedBySlug(slug: string, userId: string | null = null): Promise<BlogPost> {
    const post = await this.repository.findPublishedBySlug(slug);
    if (!post) throw new AppError(404, "POST_NOT_FOUND", "Không tìm thấy bài viết.");
    return this.enrichPost(post, userId);
  }

  async listOwnPosts(userId: string, input: ListPostsInput): Promise<PaginatedPosts> {
    const result = await this.repository.listByAuthor(userId, input);
    return { ...result, items: await this.enrichPosts(result.items, userId) };
  }

  async getOwnPost(userId: string, postId: string): Promise<BlogPost> {
    const post = await this.requireOwner(userId, postId);
    return this.enrichPost(post, userId);
  }

  async createPost(userId: string, input: WritePostInput): Promise<BlogPost> {
    await this.requireActiveCategory(input.categoryId);
    const post = await this.repository.create(userId, prepareInput(input, true));
    return this.enrichPost(post, userId);
  }

  async updatePost(userId: string, postId: string, input: WritePostInput): Promise<BlogPost> {
    await this.requireOwner(userId, postId);
    await this.requireActiveCategory(input.categoryId);
    const post = await this.repository.update(postId, prepareInput(input, false));
    if (!post) throw new AppError(404, "POST_NOT_FOUND", "Không tìm thấy bài viết.");
    return this.enrichPost(post, userId);
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    await this.requireOwner(userId, postId);
    const deleted = await this.repository.softDelete(postId);
    if (!deleted) throw new AppError(404, "POST_NOT_FOUND", "Không tìm thấy bài viết.");
  }

  private async requireActiveCategory(categoryId: string): Promise<void> {
    const category = await this.repository.findActiveCategoryById(categoryId);
    if (!category) throw new AppError(400, "CATEGORY_NOT_FOUND", "Danh mục không tồn tại hoặc đã bị ẩn.");
  }

  private async requireOwner(userId: string, postId: string): Promise<BlogPost> {
    const post = await this.repository.findById(postId);
    if (!post) throw new AppError(404, "POST_NOT_FOUND", "Không tìm thấy bài viết.");
    if (post.author.id !== userId) {
      throw new AppError(403, "POST_ACCESS_DENIED", "Bạn không có quyền chỉnh sửa bài viết này.");
    }
    return post;
  }

  private async enrichPost(post: BlogPost, userId: string | null): Promise<BlogPost> {
    const stats = this.socialStatsReader
      ? await this.socialStatsReader.getPostSocialStats([post.id], userId)
      : undefined;
    return markPermission(applySocialStats(post, stats?.get(post.id)), userId);
  }

  private async enrichPosts(posts: BlogPost[], userId: string | null): Promise<BlogPost[]> {
    if (!posts.length) return [];
    const stats = this.socialStatsReader
      ? await this.socialStatsReader.getPostSocialStats(posts.map((post) => post.id), userId)
      : undefined;
    return posts.map((post) => markPermission(applySocialStats(post, stats?.get(post.id)), userId));
  }
}
