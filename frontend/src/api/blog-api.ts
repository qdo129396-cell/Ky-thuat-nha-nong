import { apiRequest } from "./http";

export type PostStatus = "DRAFT" | "PUBLISHED" | "HIDDEN" | "DELETED";
export type PostSort = "latest" | "popular";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface PostAuthor {
  id: string;
  fullName: string;
  slug: string;
  avatarUrl: string | null;
  followerCount: number;
  viewerIsFollowing: boolean;
}

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cropName: string | null;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  category: Category;
  author: PostAuthor;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  canEdit: boolean;
}

export interface PostDetail extends PostSummary {
  contentHtml: string;
}

export type CommentStatus = "VISIBLE" | "HIDDEN" | "DELETED";

export interface BlogCommentAuthor {
  id: string;
  fullName: string;
  slug: string;
  avatarUrl: string | null;
}

export interface BlogComment {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  status: CommentStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  author: BlogCommentAuthor;
  canEdit: boolean;
  replies: BlogComment[];
}

export interface PostLikeResult {
  postId: string;
  liked: boolean;
  likeCount: number;
}

export interface FollowResult {
  userId: string;
  following: boolean;
  followerCount: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PageMeta;
}

export interface PostListQuery {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
  sort?: PostSort;
}

export interface PostInput {
  title: string;
  categoryId: string;
  cropName?: string;
  excerpt?: string;
  contentHtml: string;
  status: "DRAFT" | "PUBLISHED";
}

function queryString(query: PostListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.category) params.set("category", query.category);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.sort) params.set("sort", query.sort);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const blogApi = {
  async getCategories(): Promise<Category[]> {
    const data = await apiRequest<{ items: Category[] }>("/categories");
    return data.items;
  },

  getPosts(query: PostListQuery = {}): Promise<PaginatedResult<PostSummary>> {
    return apiRequest<PaginatedResult<PostSummary>>(`/posts${queryString(query)}`);
  },

  getMyPosts(query: Pick<PostListQuery, "page" | "limit"> = {}): Promise<PaginatedResult<PostSummary>> {
    return apiRequest<PaginatedResult<PostSummary>>(`/posts/mine${queryString(query)}`);
  },

  async getPostBySlug(slug: string): Promise<PostDetail> {
    const data = await apiRequest<{ post: PostDetail }>(`/posts/${encodeURIComponent(slug)}`);
    return data.post;
  },

  async getMyPost(postId: string): Promise<PostDetail> {
    const data = await apiRequest<{ post: PostDetail }>(`/posts/mine/${encodeURIComponent(postId)}`);
    return data.post;
  },

  async createPost(input: PostInput): Promise<PostDetail> {
    const data = await apiRequest<{ post: PostDetail }>("/posts", {
      method: "POST",
      body: JSON.stringify(input)
    });
    return data.post;
  },

  async updatePost(postId: string, input: PostInput): Promise<PostDetail> {
    const data = await apiRequest<{ post: PostDetail }>(`/posts/${encodeURIComponent(postId)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    return data.post;
  },

  deletePost(postId: string): Promise<void> {
    return apiRequest<void>(`/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
  },

  setPostLike(postId: string, liked: boolean): Promise<PostLikeResult> {
    return apiRequest<PostLikeResult>(`/posts/${encodeURIComponent(postId)}/likes/me`, {
      method: liked ? "PUT" : "DELETE"
    });
  },

  async getComments(postId: string): Promise<BlogComment[]> {
    const data = await apiRequest<{ items: BlogComment[] }>(`/posts/${encodeURIComponent(postId)}/comments`);
    return data.items;
  },

  async createComment(postId: string, input: { body: string; parentId?: string }): Promise<BlogComment> {
    const data = await apiRequest<{ comment: BlogComment }>(`/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      body: JSON.stringify(input)
    });
    return data.comment;
  },

  async updateComment(commentId: string, body: string): Promise<BlogComment> {
    const data = await apiRequest<{ comment: BlogComment }>(`/comments/${encodeURIComponent(commentId)}`, {
      method: "PATCH",
      body: JSON.stringify({ body })
    });
    return data.comment;
  },

  deleteComment(commentId: string): Promise<void> {
    return apiRequest<void>(`/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
  },

  setFollowing(userId: string, following: boolean): Promise<FollowResult> {
    return apiRequest<FollowResult>(`/users/${encodeURIComponent(userId)}/followers/me`, {
      method: following ? "PUT" : "DELETE"
    });
  }
};
