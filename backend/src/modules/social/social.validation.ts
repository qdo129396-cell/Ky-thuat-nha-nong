import { z } from "zod";

const uuid = (message: string) => z.string().uuid(message);

export const postIdParamsSchema = z.object({
  postId: uuid("Mã bài viết không hợp lệ.")
});

export const commentIdParamsSchema = z.object({
  commentId: uuid("Mã bình luận không hợp lệ.")
});

export const userIdParamsSchema = z.object({
  userId: uuid("Mã người dùng không hợp lệ.")
});

const commentBody = z.string()
  .trim()
  .min(1, "Bình luận không được để trống.")
  .max(2_000, "Bình luận không được quá 2.000 ký tự.");

export const createCommentSchema = z.object({
  body: commentBody,
  parentId: z.string().uuid("Mã bình luận cha không hợp lệ.").nullable().optional()
    .transform((value) => value ?? undefined)
});

export const updateCommentSchema = z.object({ body: commentBody });

export const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});
