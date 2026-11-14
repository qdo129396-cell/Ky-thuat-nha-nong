export type PostStatus = "DRAFT" | "PUBLISHED";
export type PostSort = "latest" | "popular";

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface BlogAuthor {
  id: string;
  fullName: string;
  slug: string;
  avatarUrl: string | null;
  followerCount: number;
  viewerIsFollowing: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  cropName: string | null;
  excerpt: string;
  contentHtml: string;
  contentText: string;
  status: PostStatus;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: BlogCategory;
  author: BlogAuthor;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  canEdit: boolean;
}

/** Social counts and viewer-specific state loaded alongside a post response. */
export interface PostSocialStats {
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  followerCount: number;
  viewerIsFollowing: boolean;
}

export interface PostSocialStatsReader {
  getPostSocialStats(postIds: string[], viewerId: string | null): Promise<Map<string, PostSocialStats>>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedPosts {
  items: BlogPost[];
  meta: PaginationMeta;
}

export interface ListPostsInput {
  query: string;
  categorySlug: string | null;
  cropName: string | null;
  sort: PostSort;
  page: number;
  limit: number;
}

export interface WritePostInput {
  title: string;
  categoryId: string;
  cropName: string | null;
  excerpt: string | null;
  contentHtml: string;
  status: PostStatus;
}

export interface PreparedPostInput extends WritePostInput {
  contentText: string;
  slug?: string;
}

export interface PostRepository {
  listCategories(): Promise<BlogCategory[]>;
  findActiveCategoryById(categoryId: string): Promise<BlogCategory | null>;
  listPublished(input: ListPostsInput): Promise<PaginatedPosts>;
  listByAuthor(authorId: string, input: ListPostsInput): Promise<PaginatedPosts>;
  findPublishedBySlug(slug: string): Promise<BlogPost | null>;
  findById(postId: string): Promise<BlogPost | null>;
  create(authorId: string, input: PreparedPostInput): Promise<BlogPost>;
  update(postId: string, input: PreparedPostInput): Promise<BlogPost | null>;
  softDelete(postId: string): Promise<boolean>;
}
