import { AppError } from "../../common/errors/app-error.js";
import type {
  BlogComment,
  FollowMutationResult,
  LikeMutationResult,
  ListCommentsInput,
  PaginatedComments,
  SocialRepository,
  SocialUser
} from "./social.types.js";

function toViewerComment(comment: BlogComment, viewerId: string | null): BlogComment {
  const ownsComment = viewerId !== null && comment.author.id === viewerId && !comment.isDeleted && comment.status === "VISIBLE";
  return {
    ...comment,
    canEdit: ownsComment,
    canDelete: ownsComment,
    replies: comment.replies.map((reply) => toViewerComment(reply, viewerId))
  };
}

export class SocialService {
  constructor(private readonly repository: SocialRepository) {}

  async getComments(
    postId: string,
    input: ListCommentsInput,
    viewerId: string | null = null
  ): Promise<PaginatedComments> {
    await this.requirePublishedPost(postId);
    const result = await this.repository.listComments(postId, input);
    return { ...result, items: result.items.map((comment) => toViewerComment(comment, viewerId)) };
  }

  async likePost(userId: string, postId: string): Promise<LikeMutationResult> {
    await this.requireActiveUser(userId);
    await this.requirePublishedPost(postId);
    await this.repository.setPostLike(postId, userId);
    return { postId, liked: true, likeCount: await this.repository.countPostLikes(postId) };
  }

  async unlikePost(userId: string, postId: string): Promise<LikeMutationResult> {
    await this.requireActiveUser(userId);
    await this.requirePublishedPost(postId);
    await this.repository.removePostLike(postId, userId);
    return { postId, liked: false, likeCount: await this.repository.countPostLikes(postId) };
  }

  async createComment(
    userId: string,
    postId: string,
    input: { body: string; parentId?: string }
  ): Promise<BlogComment> {
    await this.requireActiveUser(userId);
    await this.requirePublishedPost(postId);
    const parentId = input.parentId ?? null;
    if (parentId) await this.assertValidCommentParent(postId, parentId);
    const comment = await this.repository.createComment({ postId, authorId: userId, parentId, body: input.body });
    return toViewerComment(comment, userId);
  }

  async updateComment(userId: string, commentId: string, body: string): Promise<BlogComment> {
    await this.requireActiveUser(userId);
    const comment = await this.requireOwnedVisibleComment(userId, commentId);
    const updated = await this.repository.updateComment(comment.id, body);
    if (!updated) throw new AppError(404, "COMMENT_NOT_FOUND", "Không tìm thấy bình luận.");
    return toViewerComment(updated, userId);
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    await this.requireActiveUser(userId);
    const comment = await this.requireOwnedVisibleComment(userId, commentId);
    const deleted = await this.repository.softDeleteComment(comment.id);
    if (!deleted) throw new AppError(404, "COMMENT_NOT_FOUND", "Không tìm thấy bình luận.");
  }

  async followUser(userId: string, targetUserId: string): Promise<FollowMutationResult> {
    await this.requireActiveUser(userId);
    if (userId === targetUserId) {
      throw new AppError(422, "CANNOT_FOLLOW_SELF", "Bạn không thể theo dõi chính mình.");
    }
    await this.requireActiveTarget(targetUserId);
    await this.repository.setFollow(userId, targetUserId);
    return {
      userId: targetUserId,
      following: true,
      followerCount: await this.repository.countFollowers(targetUserId)
    };
  }

  async unfollowUser(userId: string, targetUserId: string): Promise<FollowMutationResult> {
    await this.requireActiveUser(userId);
    if (userId === targetUserId) {
      throw new AppError(422, "CANNOT_FOLLOW_SELF", "Bạn không thể bỏ theo dõi chính mình.");
    }
    await this.requireActiveTarget(targetUserId);
    await this.repository.removeFollow(userId, targetUserId);
    return {
      userId: targetUserId,
      following: false,
      followerCount: await this.repository.countFollowers(targetUserId)
    };
  }

  private async requirePublishedPost(postId: string): Promise<void> {
    if (!await this.repository.findPublishedPost(postId)) {
      throw new AppError(404, "POST_NOT_FOUND", "Không tìm thấy bài viết công khai.");
    }
  }

  private async requireActiveUser(userId: string): Promise<SocialUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new AppError(401, "ACCOUNT_NOT_FOUND", "Phiên đăng nhập không còn hợp lệ.");
    if (user.status !== "ACTIVE") {
      throw new AppError(403, "ACCOUNT_BLOCKED", "Tài khoản đã bị khóa.");
    }
    return user;
  }

  private async requireActiveTarget(userId: string): Promise<SocialUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
    if (user.status !== "ACTIVE") {
      throw new AppError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
    }
    return user;
  }

  private async assertValidCommentParent(postId: string, parentId: string): Promise<void> {
    const parent = await this.repository.findCommentById(parentId);
    if (!parent || parent.postId !== postId || parent.isDeleted || parent.status !== "VISIBLE") {
      throw new AppError(400, "COMMENT_PARENT_INVALID", "Bình luận cha không hợp lệ.");
    }
    if (parent.parentId !== null) {
      throw new AppError(400, "COMMENT_REPLY_DEPTH_EXCEEDED", "Chỉ hỗ trợ trả lời bình luận một cấp.");
    }
  }

  private async requireOwnedVisibleComment(userId: string, commentId: string): Promise<BlogComment> {
    const comment = await this.repository.findCommentById(commentId);
    if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "Không tìm thấy bình luận.");
    if (comment.author.id !== userId) {
      throw new AppError(403, "COMMENT_ACCESS_DENIED", "Bạn không có quyền thay đổi bình luận này.");
    }
    if (comment.isDeleted || comment.status !== "VISIBLE") {
      throw new AppError(409, "COMMENT_NOT_EDITABLE", "Bình luận này không còn có thể chỉnh sửa.");
    }
    return comment;
  }
}
