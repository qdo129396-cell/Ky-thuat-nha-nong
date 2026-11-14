import type { Request, Response } from "express";
import {
  commentIdParamsSchema,
  createCommentSchema,
  listCommentsQuerySchema,
  postIdParamsSchema,
  updateCommentSchema,
  userIdParamsSchema
} from "./social.validation.js";
import type { SocialService } from "./social.service.js";

export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  comments = async (request: Request, response: Response): Promise<void> => {
    const { postId } = postIdParamsSchema.parse(request.params);
    const input = listCommentsQuerySchema.parse(request.query);
    const result = await this.socialService.getComments(postId, input, request.auth?.userId ?? null);
    response.json({ success: true, data: result, requestId: request.id });
  };

  like = async (request: Request, response: Response): Promise<void> => {
    const { postId } = postIdParamsSchema.parse(request.params);
    const result = await this.socialService.likePost(request.auth!.userId, postId);
    response.json({ success: true, data: result, requestId: request.id });
  };

  unlike = async (request: Request, response: Response): Promise<void> => {
    const { postId } = postIdParamsSchema.parse(request.params);
    const result = await this.socialService.unlikePost(request.auth!.userId, postId);
    response.json({ success: true, data: result, requestId: request.id });
  };

  createComment = async (request: Request, response: Response): Promise<void> => {
    const { postId } = postIdParamsSchema.parse(request.params);
    const input = createCommentSchema.parse(request.body);
    const comment = await this.socialService.createComment(request.auth!.userId, postId, input);
    response.status(201).json({ success: true, data: { comment }, requestId: request.id });
  };

  updateComment = async (request: Request, response: Response): Promise<void> => {
    const { commentId } = commentIdParamsSchema.parse(request.params);
    const { body } = updateCommentSchema.parse(request.body);
    const comment = await this.socialService.updateComment(request.auth!.userId, commentId, body);
    response.json({ success: true, data: { comment }, requestId: request.id });
  };

  removeComment = async (request: Request, response: Response): Promise<void> => {
    const { commentId } = commentIdParamsSchema.parse(request.params);
    await this.socialService.deleteComment(request.auth!.userId, commentId);
    response.status(204).send();
  };

  follow = async (request: Request, response: Response): Promise<void> => {
    const { userId } = userIdParamsSchema.parse(request.params);
    const result = await this.socialService.followUser(request.auth!.userId, userId);
    response.json({ success: true, data: result, requestId: request.id });
  };

  unfollow = async (request: Request, response: Response): Promise<void> => {
    const { userId } = userIdParamsSchema.parse(request.params);
    const result = await this.socialService.unfollowUser(request.auth!.userId, userId);
    response.json({ success: true, data: result, requestId: request.id });
  };
}
