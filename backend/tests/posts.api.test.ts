import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { PostController } from "../src/modules/posts/post.controller.js";
import { PostService } from "../src/modules/posts/post.service.js";
import type {
  BlogCategory,
  BlogPost,
  ListPostsInput,
  PaginatedPosts,
  PostRepository,
  PreparedPostInput
} from "../src/modules/posts/post.types.js";
import { TokenService } from "../src/services/token-service.js";

class MemoryPostRepository implements PostRepository {
  readonly category: BlogCategory = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Kỹ thuật trồng trọt",
    slug: "ky-thuat-trong-trot",
    description: null
  };
  posts: BlogPost[] = [];

  async listCategories(): Promise<BlogCategory[]> { return [this.category]; }
  async findActiveCategoryById(categoryId: string): Promise<BlogCategory | null> {
    return categoryId === this.category.id ? this.category : null;
  }
  async listPublished(input: ListPostsInput): Promise<PaginatedPosts> {
    return this.paginate(this.posts.filter((post) => post.status === "PUBLISHED"), input);
  }
  async listByAuthor(authorId: string, input: ListPostsInput): Promise<PaginatedPosts> {
    return this.paginate(this.posts.filter((post) => post.author.id === authorId), input);
  }
  async findPublishedBySlug(slug: string): Promise<BlogPost | null> {
    return this.posts.find((post) => post.slug === slug && post.status === "PUBLISHED") ?? null;
  }
  async findById(postId: string): Promise<BlogPost | null> {
    return this.posts.find((post) => post.id === postId) ?? null;
  }
  async create(authorId: string, input: PreparedPostInput): Promise<BlogPost> {
    const now = new Date().toISOString();
    const post: BlogPost = {
      id: randomUUID(), title: input.title, slug: input.slug!, cropName: input.cropName,
      excerpt: input.excerpt!, contentHtml: input.contentHtml, contentText: input.contentText,
      status: input.status, viewCount: 0, publishedAt: input.status === "PUBLISHED" ? now : null,
      createdAt: now, updatedAt: now, category: this.category,
      author: {
        id: authorId, fullName: "Người viết", slug: "nguoi-viet", avatarUrl: null,
        followerCount: 0, viewerIsFollowing: false
      },
      likeCount: 0, commentCount: 0, viewerHasLiked: false, canEdit: false
    };
    this.posts.push(post);
    return post;
  }
  async update(postId: string, input: PreparedPostInput): Promise<BlogPost | null> {
    const post = this.posts.find((item) => item.id === postId);
    if (!post) return null;
    post.title = input.title;
    post.cropName = input.cropName;
    post.excerpt = input.excerpt!;
    post.contentHtml = input.contentHtml;
    post.contentText = input.contentText;
    post.status = input.status;
    post.publishedAt = input.status === "PUBLISHED" ? post.publishedAt ?? new Date().toISOString() : null;
    post.updatedAt = new Date().toISOString();
    return post;
  }
  async softDelete(postId: string): Promise<boolean> {
    const index = this.posts.findIndex((post) => post.id === postId);
    if (index < 0) return false;
    this.posts.splice(index, 1);
    return true;
  }

  private paginate(posts: BlogPost[], input: ListPostsInput): PaginatedPosts {
    const filtered = input.query
      ? posts.filter((post) => post.title.toLowerCase().includes(input.query.toLowerCase()))
      : posts;
    const start = (input.page - 1) * input.limit;
    return {
      items: filtered.slice(start, start + input.limit),
      meta: {
        page: input.page,
        limit: input.limit,
        totalItems: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / input.limit))
      }
    };
  }
}

describe("Blog REST API", () => {
  it("tạo nháp đã sanitize, chỉ công khai bài xuất bản và áp dụng quyền sở hữu", async () => {
    const repository = new MemoryPostRepository();
    const tokenService = new TokenService("test-secret-with-at-least-thirty-two-characters", "15m");
    const app = createApp({
      postController: new PostController(new PostService(repository)),
      tokenService,
      frontendUrl: "http://localhost:5173",
      nodeEnv: "test"
    });
    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    const ownerToken = (await tokenService.createAccessToken(ownerId, "MEMBER")).token;
    const otherToken = (await tokenService.createAccessToken(otherUserId, "MEMBER")).token;

    await request(app).get("/api/v1/categories").expect(200)
      .expect((response) => expect(response.body.data.items).toHaveLength(1));
    await request(app).get("/api/v1/posts/mine").expect(401);
    await request(app).post("/api/v1/posts").send({}).expect(401);

    const created = await request(app).post("/api/v1/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Khử trùng đất trước khi xuống giống",
        categoryId: repository.category.id,
        status: "DRAFT",
        contentHtml: "<p>Khử trùng đất bằng vôi trước khi xuống giống để hạn chế nấm bệnh.</p><script>alert('x')</script><a href=\"javascript:alert(1)\">x</a>"
      })
      .expect(201);
    const post = created.body.data.post as BlogPost;
    expect(post.status).toBe("DRAFT");
    expect(post.contentHtml).not.toContain("script");
    expect(post.contentHtml).not.toContain("javascript:");
    expect(post.canEdit).toBe(true);

    await request(app).get("/api/v1/posts").expect(200)
      .expect((response) => expect(response.body.data.items).toHaveLength(0));
    await request(app).get("/api/v1/posts/mine").set("Authorization", `Bearer ${ownerToken}`).expect(200)
      .expect((response) => expect(response.body.data.items).toHaveLength(1));

    await request(app).patch(`/api/v1/posts/${post.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        title: post.title,
        categoryId: repository.category.id,
        status: "PUBLISHED",
        contentHtml: post.contentHtml
      })
      .expect(403);

    const published = await request(app).patch(`/api/v1/posts/${post.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: post.title,
        categoryId: repository.category.id,
        status: "PUBLISHED",
        contentHtml: post.contentHtml
      })
      .expect(200);
    expect(published.body.data.post.publishedAt).toBeTruthy();
    await request(app).get("/api/v1/posts").expect(200)
      .expect((response) => expect(response.body.data.items).toHaveLength(1));
    await request(app).get(`/api/v1/posts/${post.slug}`).expect(200);

    await request(app).delete(`/api/v1/posts/${post.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(204);
    await request(app).get(`/api/v1/posts/${post.slug}`).expect(404);
  });
});
