import type { Request, Response } from "express";
import {
  createPostSchema,
  listPostsQuerySchema,
  postIdParamsSchema,
  postSlugParamsSchema,
  updatePostSchema
} from "./post.validation.js";
import type { ListPostsInput } from "./post.types.js";
import type { PostService } from "./post.service.js";

function parseListInput(request: Request): ListPostsInput {
  const input = listPostsQuerySchema.parse(request.query);
  return {
    query: input.q,
    categorySlug: input.category ?? null,
    cropName: input.crop ?? null,
    sort: input.sort,
    page: input.page,
    limit: input.limit
  };
}

export class PostController {
  constructor(private readonly postService: PostService) {}

  categories = async (request: Request, response: Response): Promise<void> => {
    const items = await this.postService.listCategories();
    response.json({ success: true, data: { items }, requestId: request.id });
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const result = await this.postService.listPublished(parseListInput(request), request.auth?.userId ?? null);
    response.json({ success: true, data: result, requestId: request.id });
  };

  detail = async (request: Request, response: Response): Promise<void> => {
    const { slug } = postSlugParamsSchema.parse(request.params);
    const post = await this.postService.getPublishedBySlug(slug, request.auth?.userId ?? null);
    response.json({ success: true, data: { post }, requestId: request.id });
  };

  mine = async (request: Request, response: Response): Promise<void> => {
    const result = await this.postService.listOwnPosts(request.auth!.userId, parseListInput(request));
    response.json({ success: true, data: result, requestId: request.id });
  };

  ownDetail = async (request: Request, response: Response): Promise<void> => {
    const { id } = postIdParamsSchema.parse(request.params);
    const post = await this.postService.getOwnPost(request.auth!.userId, id);
    response.json({ success: true, data: { post }, requestId: request.id });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const input = createPostSchema.parse(request.body);
    const post = await this.postService.createPost(request.auth!.userId, {
      ...input,
      cropName: input.cropName ?? null,
      excerpt: input.excerpt ?? null
    });
    response.status(201).json({ success: true, data: { post }, requestId: request.id });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const { id } = postIdParamsSchema.parse(request.params);
    const input = updatePostSchema.parse(request.body);
    const post = await this.postService.updatePost(request.auth!.userId, id, {
      ...input,
      cropName: input.cropName ?? null,
      excerpt: input.excerpt ?? null
    });
    response.json({ success: true, data: { post }, requestId: request.id });
  };

  remove = async (request: Request, response: Response): Promise<void> => {
    const { id } = postIdParamsSchema.parse(request.params);
    await this.postService.deletePost(request.auth!.userId, id);
    response.status(204).send();
  };
}
