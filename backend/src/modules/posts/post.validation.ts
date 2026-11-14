import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional()
  .transform((value) => value || undefined);

const writePostShape = {
  title: z.string().trim().min(10, "Tiêu đề cần có ít nhất 10 ký tự.").max(200),
  categoryId: z.string().uuid("Danh mục không hợp lệ."),
  cropName: optionalText(100),
  excerpt: optionalText(500),
  contentHtml: z.string().max(100_000),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT")
};

export const createPostSchema = z.object(writePostShape);
export const updatePostSchema = z.object(writePostShape);

export const listPostsQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(120).optional().transform((value) => value || undefined),
  crop: z.string().trim().max(100).optional().transform((value) => value || undefined),
  sort: z.enum(["latest", "popular"]).optional().default("latest"),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(24).optional().default(12)
});

export const postIdParamsSchema = z.object({
  id: z.string().uuid("Mã bài viết không hợp lệ.")
});

export const postSlugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(240)
});
