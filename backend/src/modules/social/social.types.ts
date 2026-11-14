import type { PaginationMeta, PostSocialStatsReader } from "../posts/post.types.js";

export type CommentStatus = "VISIBLE" | "HIDDEN" | "DELETED";

export interface SocialAuthor {
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
  author: SocialAuthor;
  canEdit: boolean;
  canDelete: boolean;
  replies: BlogComment[];
}

export interface ListCommentsInput {
  page: number;
  limit: number;
}

export interface PaginatedComments {
  items: BlogComment[];
  meta: PaginationMeta;
}

export interface SocialUser {
  id: string;
  status: "ACTIVE" | "BLOCKED";
}

export interface PublishedPostReference {
  id: string;
  authorId: string;
}

export interface SocialRepository extends PostSocialStatsReader {
  findUserById(userId: string): Promise<SocialUser | null>;
  findPublishedPost(postId: string): Promise<PublishedPostReference | null>;

  setPostLike(postId: string, userId: string): Promise<boolean>;
  removePostLike(postId: string, userId: string): Promise<boolean>;
  countPostLikes(postId: string): Promise<number>;

  listComments(postId: string, input: ListCommentsInput): Promise<PaginatedComments>;
  findCommentById(commentId: string): Promise<BlogComment | null>;
  createComment(input: { postId: string; authorId: string; parentId: string | null; body: string }): Promise<BlogComment>;
  updateComment(commentId: string, body: string): Promise<BlogComment | null>;
  softDeleteComment(commentId: string): Promise<boolean>;

  setFollow(followerId: string, followingId: string): Promise<boolean>;
  removeFollow(followerId: string, followingId: string): Promise<boolean>;
  countFollowers(userId: string): Promise<number>;
}

export interface LikeMutationResult {
  postId: string;
  liked: boolean;
  likeCount: number;
}

export interface FollowMutationResult {
  userId: string;
  following: boolean;
  followerCount: number;
}
