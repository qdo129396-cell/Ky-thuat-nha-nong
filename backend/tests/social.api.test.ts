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
  PostSocialStats,
  PreparedPostInput
} from "../src/modules/posts/post.types.js";
import { SocialController } from "../src/modules/social/social.controller.js";
import { SocialService } from "../src/modules/social/social.service.js";
import type {
  BlogComment,
  ListCommentsInput,
  PaginatedComments,
  SocialAuthor,
  SocialRepository,
  SocialUser
} from "../src/modules/social/social.types.js";
import { TokenService } from "../src/services/token-service.js";

interface TestActor extends SocialAuthor {
  status: "ACTIVE" | "BLOCKED";
}

class MemoryPostRepository implements PostRepository {
  readonly category: BlogCategory = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Kỹ thuật trồng trọt",
    slug: "ky-thuat-trong-trot",
    description: null
  };
  readonly posts: BlogPost[] = [];

  seedPublished(author: TestActor, slug: string): BlogPost {
    const now = new Date().toISOString();
    const post: BlogPost = {
      id: randomUUID(),
      title: `Kinh nghiệm ${slug} cho vụ mùa mới`,
      slug,
      cropName: "Rau màu",
      excerpt: "Các bước chuẩn bị đất và chăm sóc cây trồng trong mùa mưa.",
      contentHtml: "<p>Nội dung hướng dẫn canh tác đủ dài để xuất bản công khai.</p>",
      contentText: "Nội dung hướng dẫn canh tác đủ dài để xuất bản công khai.",
      status: "PUBLISHED",
      viewCount: 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      category: this.category,
      author: {
        id: author.id,
        fullName: author.fullName,
        slug: author.slug,
        avatarUrl: author.avatarUrl,
        followerCount: 0,
        viewerIsFollowing: false
      },
      likeCount: 0,
      commentCount: 0,
      viewerHasLiked: false,
      canEdit: false
    };
    this.posts.push(post);
    return post;
  }

  async listCategories(): Promise<BlogCategory[]> {
    return [this.category];
  }

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
      id: randomUUID(),
      title: input.title,
      slug: input.slug ?? randomUUID(),
      cropName: input.cropName,
      excerpt: input.excerpt ?? "",
      contentHtml: input.contentHtml,
      contentText: input.contentText,
      status: input.status,
      viewCount: 0,
      publishedAt: input.status === "PUBLISHED" ? now : null,
      createdAt: now,
      updatedAt: now,
      category: this.category,
      author: {
        id: authorId,
        fullName: "Người viết",
        slug: "nguoi-viet",
        avatarUrl: null,
        followerCount: 0,
        viewerIsFollowing: false
      },
      likeCount: 0,
      commentCount: 0,
      viewerHasLiked: false,
      canEdit: false
    };
    this.posts.push(post);
    return post;
  }

  async update(postId: string, input: PreparedPostInput): Promise<BlogPost | null> {
    const post = this.posts.find((item) => item.id === postId);
    if (!post) return null;
    post.title = input.title;
    post.cropName = input.cropName;
    post.excerpt = input.excerpt ?? "";
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
    const matching = input.query
      ? posts.filter((post) => post.title.toLocaleLowerCase().includes(input.query.toLocaleLowerCase()))
      : posts;
    const start = (input.page - 1) * input.limit;
    return {
      items: matching.slice(start, start + input.limit),
      meta: {
        page: input.page,
        limit: input.limit,
        totalItems: matching.length,
        totalPages: Math.max(1, Math.ceil(matching.length / input.limit))
      }
    };
  }
}

class MemorySocialRepository implements SocialRepository {
  readonly users = new Map<string, SocialUser>();
  private readonly authors = new Map<string, SocialAuthor>();
  private readonly likes = new Set<string>();
  private readonly follows = new Set<string>();
  private readonly comments = new Map<string, BlogComment>();

  constructor(
    private readonly postRepository: MemoryPostRepository,
    actors: TestActor[]
  ) {
    for (const actor of actors) {
      this.users.set(actor.id, { id: actor.id, status: actor.status });
      this.authors.set(actor.id, {
        id: actor.id,
        fullName: actor.fullName,
        slug: actor.slug,
        avatarUrl: actor.avatarUrl
      });
    }
  }

  seedComment(postId: string, authorId: string, body: string, parentId: string | null = null): BlogComment {
    const comment = this.makeComment({ postId, authorId, parentId, body });
    this.comments.set(comment.id, comment);
    return this.copyComment(comment);
  }

  async getPostSocialStats(postIds: string[], viewerId: string | null): Promise<Map<string, PostSocialStats>> {
    const stats = new Map<string, PostSocialStats>();
    for (const postId of postIds) {
      const post = this.postRepository.posts.find((item) => item.id === postId);
      if (!post) continue;
      const authorId = post.author.id;
      stats.set(postId, {
        likeCount: await this.countPostLikes(postId),
        commentCount: [...this.comments.values()].filter((comment) => (
          comment.postId === postId && comment.status === "VISIBLE" && !comment.isDeleted
        )).length,
        viewerHasLiked: viewerId !== null && this.likes.has(this.likeKey(postId, viewerId)),
        followerCount: await this.countFollowers(authorId),
        viewerIsFollowing: viewerId !== null && this.follows.has(this.followKey(viewerId, authorId))
      });
    }
    return stats;
  }

  async findUserById(userId: string): Promise<SocialUser | null> {
    return this.users.get(userId) ?? null;
  }

  async findPublishedPost(postId: string): Promise<{ id: string; authorId: string } | null> {
    const post = this.postRepository.posts.find((item) => item.id === postId && item.status === "PUBLISHED");
    return post ? { id: post.id, authorId: post.author.id } : null;
  }

  async setPostLike(postId: string, userId: string): Promise<boolean> {
    const key = this.likeKey(postId, userId);
    if (this.likes.has(key)) return false;
    this.likes.add(key);
    return true;
  }

  async removePostLike(postId: string, userId: string): Promise<boolean> {
    return this.likes.delete(this.likeKey(postId, userId));
  }

  async countPostLikes(postId: string): Promise<number> {
    return [...this.likes].filter((key) => key.startsWith(`${postId}:`)).length;
  }

  async listComments(postId: string, input: ListCommentsInput): Promise<PaginatedComments> {
    const all = [...this.comments.values()].filter((comment) => comment.postId === postId);
    const visibleReplies = (parentId: string): BlogComment[] => all
      .filter((comment) => comment.parentId === parentId && comment.status === "VISIBLE" && !comment.isDeleted)
      .map((comment) => this.copyComment(comment));
    const roots = all.filter((comment) => {
      if (comment.parentId !== null) return false;
      return comment.status === "VISIBLE" && !comment.isDeleted || visibleReplies(comment.id).length > 0;
    });
    const start = (input.page - 1) * input.limit;
    const items = roots.slice(start, start + input.limit).map((root) => (
      this.copyComment(root, visibleReplies(root.id))
    ));
    return {
      items,
      meta: {
        page: input.page,
        limit: input.limit,
        totalItems: roots.length,
        totalPages: Math.max(1, Math.ceil(roots.length / input.limit))
      }
    };
  }

  async findCommentById(commentId: string): Promise<BlogComment | null> {
    const comment = this.comments.get(commentId);
    return comment ? this.copyComment(comment) : null;
  }

  async createComment(input: { postId: string; authorId: string; parentId: string | null; body: string }): Promise<BlogComment> {
    const comment = this.makeComment(input);
    this.comments.set(comment.id, comment);
    return this.copyComment(comment);
  }

  async updateComment(commentId: string, body: string): Promise<BlogComment | null> {
    const comment = this.comments.get(commentId);
    if (!comment) return null;
    comment.body = body;
    comment.updatedAt = new Date().toISOString();
    return this.copyComment(comment);
  }

  async softDeleteComment(commentId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment || comment.isDeleted) return false;
    comment.status = "DELETED";
    comment.isDeleted = true;
    comment.updatedAt = new Date().toISOString();
    return true;
  }

  async setFollow(followerId: string, followingId: string): Promise<boolean> {
    const key = this.followKey(followerId, followingId);
    if (this.follows.has(key)) return false;
    this.follows.add(key);
    return true;
  }

  async removeFollow(followerId: string, followingId: string): Promise<boolean> {
    return this.follows.delete(this.followKey(followerId, followingId));
  }

  async countFollowers(userId: string): Promise<number> {
    return [...this.follows].filter((key) => key.endsWith(`:${userId}`)).length;
  }

  private makeComment(input: { postId: string; authorId: string; parentId: string | null; body: string }): BlogComment {
    const now = new Date().toISOString();
    const author = this.authors.get(input.authorId);
    if (!author) throw new Error("Missing test author");
    return {
      id: randomUUID(),
      postId: input.postId,
      parentId: input.parentId,
      body: input.body,
      status: "VISIBLE",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      author,
      canEdit: false,
      canDelete: false,
      replies: []
    };
  }

  private copyComment(comment: BlogComment, replies: BlogComment[] = []): BlogComment {
    return {
      ...comment,
      body: comment.isDeleted ? "Bình luận đã bị xóa." : comment.body,
      author: { ...comment.author },
      canEdit: false,
      canDelete: false,
      replies: replies.map((reply) => this.copyComment(reply))
    };
  }

  private likeKey(postId: string, userId: string): string {
    return `${postId}:${userId}`;
  }

  private followKey(followerId: string, followingId: string): string {
    return `${followerId}:${followingId}`;
  }
}

function actor(fullName: string, slug: string): TestActor {
  return { id: randomUUID(), fullName, slug, avatarUrl: null, status: "ACTIVE" };
}

function createSocialTestApp() {
  const owner = actor("Chủ bài viết", "chu-bai-viet");
  const alice = actor("Nguyễn Thị An", "nguyen-thi-an");
  const bob = actor("Trần Văn Bình", "tran-van-binh");
  const outsider = actor("Lê Minh Châu", "le-minh-chau");
  const postRepository = new MemoryPostRepository();
  const post = postRepository.seedPublished(owner, "cham-soc-rau-mua-mua");
  const otherPost = postRepository.seedPublished(owner, "xu-ly-dat-truoc-khi-gieo");
  const socialRepository = new MemorySocialRepository(postRepository, [owner, alice, bob, outsider]);
  const tokenService = new TokenService("test-secret-with-at-least-thirty-two-characters", "15m");
  const app = createApp({
    postController: new PostController(new PostService(postRepository, socialRepository)),
    socialController: new SocialController(new SocialService(socialRepository)),
    tokenService,
    frontendUrl: "http://localhost:5173",
    nodeEnv: "test"
  });

  return {
    app,
    owner,
    alice,
    bob,
    outsider,
    post,
    otherPost,
    socialRepository,
    async tokenFor(user: TestActor): Promise<string> {
      return (await tokenService.createAccessToken(user.id, "MEMBER")).token;
    }
  };
}

describe("Social REST API", () => {
  it("cho khách xem bình luận công khai nhưng chặn toàn bộ thao tác ghi", async () => {
    const test = createSocialTestApp();
    const seeded = test.socialRepository.seedComment(test.post.id, test.owner.id, "Bình luận hiển thị công khai.");

    const comments = await request(test.app).get(`/api/v1/posts/${test.post.id}/comments`).expect(200);
    expect(comments.body.data.items).toHaveLength(1);
    expect(comments.body.data.items[0]).toMatchObject({
      id: seeded.id,
      body: "Bình luận hiển thị công khai.",
      canEdit: false,
      canDelete: false
    });

    const guestLike = await request(test.app).put(`/api/v1/posts/${test.post.id}/likes/me`).expect(401);
    expect(guestLike.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    await request(test.app).delete(`/api/v1/posts/${test.post.id}/likes/me`).expect(401);
    await request(test.app).post(`/api/v1/posts/${test.post.id}/comments`)
      .send({ body: "Khách không thể gửi bình luận." }).expect(401);
    await request(test.app).patch(`/api/v1/comments/${seeded.id}`)
      .send({ body: "Khách không thể sửa." }).expect(401);
    await request(test.app).delete(`/api/v1/comments/${seeded.id}`).expect(401);
    await request(test.app).put(`/api/v1/users/${test.owner.id}/followers/me`).expect(401);
    await request(test.app).delete(`/api/v1/users/${test.owner.id}/followers/me`).expect(401);
  });

  it("đặt hoặc bỏ like có tính idempotent, cập nhật số lượng và trạng thái theo người xem", async () => {
    const test = createSocialTestApp();
    const aliceToken = await test.tokenFor(test.alice);
    const bobToken = await test.tokenFor(test.bob);

    const firstLike = await request(test.app).put(`/api/v1/posts/${test.post.id}/likes/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(firstLike.body.data).toMatchObject({ postId: test.post.id, liked: true, likeCount: 1 });

    const repeatedLike = await request(test.app).put(`/api/v1/posts/${test.post.id}/likes/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(repeatedLike.body.data).toMatchObject({ liked: true, likeCount: 1 });

    const secondViewerLike = await request(test.app).put(`/api/v1/posts/${test.post.id}/likes/me`)
      .set("Authorization", `Bearer ${bobToken}`).expect(200);
    expect(secondViewerLike.body.data).toMatchObject({ liked: true, likeCount: 2 });

    const guestDetail = await request(test.app).get(`/api/v1/posts/${test.post.slug}`).expect(200);
    expect(guestDetail.body.data.post).toMatchObject({ likeCount: 2, viewerHasLiked: false });
    const aliceDetail = await request(test.app).get(`/api/v1/posts/${test.post.slug}`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(aliceDetail.body.data.post).toMatchObject({ likeCount: 2, viewerHasLiked: true });
    const outsiderDetail = await request(test.app).get(`/api/v1/posts/${test.post.slug}`)
      .set("Authorization", `Bearer ${await test.tokenFor(test.outsider)}`).expect(200);
    expect(outsiderDetail.body.data.post).toMatchObject({ likeCount: 2, viewerHasLiked: false });

    const unlike = await request(test.app).delete(`/api/v1/posts/${test.post.id}/likes/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(unlike.body.data).toMatchObject({ postId: test.post.id, liked: false, likeCount: 1 });
    const repeatedUnlike = await request(test.app).delete(`/api/v1/posts/${test.post.id}/likes/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(repeatedUnlike.body.data).toMatchObject({ liked: false, likeCount: 1 });
  });

  it("hỗ trợ reply một cấp, bảo vệ quyền sở hữu và giữ placeholder khi xóa comment cha", async () => {
    const test = createSocialTestApp();
    const aliceToken = await test.tokenFor(test.alice);
    const bobToken = await test.tokenFor(test.bob);
    const outsiderToken = await test.tokenFor(test.outsider);

    const createdRoot = await request(test.app).post(`/api/v1/posts/${test.post.id}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ body: "Nên phủ rơm để giữ ẩm cho luống rau." }).expect(201);
    const root = createdRoot.body.data.comment as BlogComment;
    expect(root).toMatchObject({ parentId: null, canEdit: true, canDelete: true });

    const createdReply = await request(test.app).post(`/api/v1/posts/${test.post.id}/comments`)
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ body: "Cảm ơn, tôi sẽ áp dụng cách này.", parentId: root.id }).expect(201);
    const reply = createdReply.body.data.comment as BlogComment;
    expect(reply).toMatchObject({ parentId: root.id, canEdit: true, canDelete: true });

    const guestTree = await request(test.app).get(`/api/v1/posts/${test.post.id}/comments`).expect(200);
    expect(guestTree.body.data.items).toHaveLength(1);
    expect(guestTree.body.data.items[0]).toMatchObject({
      id: root.id,
      canEdit: false,
      canDelete: false,
      replies: [{ id: reply.id, canEdit: false, canDelete: false }]
    });
    const statsBeforeDelete = await test.socialRepository.getPostSocialStats([test.post.id], null);
    expect(statsBeforeDelete.get(test.post.id)?.commentCount).toBe(2);

    const forbiddenUpdate = await request(test.app).patch(`/api/v1/comments/${root.id}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ body: "Người khác không thể sửa bình luận này." }).expect(403);
    expect(forbiddenUpdate.body.error.code).toBe("COMMENT_ACCESS_DENIED");
    await request(test.app).delete(`/api/v1/comments/${reply.id}`)
      .set("Authorization", `Bearer ${outsiderToken}`).expect(403);

    const updated = await request(test.app).patch(`/api/v1/comments/${root.id}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ body: "Nên phủ rơm hoặc vỏ trấu để giữ ẩm cho luống rau." }).expect(200);
    expect(updated.body.data.comment).toMatchObject({
      id: root.id,
      body: "Nên phủ rơm hoặc vỏ trấu để giữ ẩm cho luống rau.",
      canEdit: true,
      canDelete: true
    });

    const crossPostParent = await request(test.app).post(`/api/v1/posts/${test.otherPost.id}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ body: "Không được dùng comment của bài khác làm cha.", parentId: root.id }).expect(400);
    expect(crossPostParent.body.error.code).toBe("COMMENT_PARENT_INVALID");
    const deepReply = await request(test.app).post(`/api/v1/posts/${test.post.id}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ body: "Không cho phép reply sâu hơn một cấp.", parentId: reply.id }).expect(400);
    expect(deepReply.body.error.code).toBe("COMMENT_REPLY_DEPTH_EXCEEDED");

    await request(test.app).delete(`/api/v1/comments/${root.id}`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(204);
    const treeAfterDelete = await request(test.app).get(`/api/v1/posts/${test.post.id}/comments`).expect(200);
    expect(treeAfterDelete.body.data.items).toHaveLength(1);
    expect(treeAfterDelete.body.data.items[0]).toMatchObject({
      id: root.id,
      body: "Bình luận đã bị xóa.",
      isDeleted: true,
      canEdit: false,
      canDelete: false,
      replies: [{ id: reply.id, body: "Cảm ơn, tôi sẽ áp dụng cách này." }]
    });
    const statsAfterDelete = await test.socialRepository.getPostSocialStats([test.post.id], null);
    expect(statsAfterDelete.get(test.post.id)?.commentCount).toBe(1);
  });

  it("follow và unfollow có tính idempotent, hiển thị theo người xem và chặn tự theo dõi", async () => {
    const test = createSocialTestApp();
    const aliceToken = await test.tokenFor(test.alice);
    const bobToken = await test.tokenFor(test.bob);

    const firstFollow = await request(test.app).put(`/api/v1/users/${test.owner.id}/followers/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(firstFollow.body.data).toMatchObject({ userId: test.owner.id, following: true, followerCount: 1 });
    const repeatedFollow = await request(test.app).put(`/api/v1/users/${test.owner.id}/followers/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(repeatedFollow.body.data).toMatchObject({ following: true, followerCount: 1 });
    const bobFollows = await request(test.app).put(`/api/v1/users/${test.owner.id}/followers/me`)
      .set("Authorization", `Bearer ${bobToken}`).expect(200);
    expect(bobFollows.body.data).toMatchObject({ following: true, followerCount: 2 });

    const aliceDetail = await request(test.app).get(`/api/v1/posts/${test.post.slug}`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(aliceDetail.body.data.post.author).toMatchObject({ followerCount: 2, viewerIsFollowing: true });
    const outsiderDetail = await request(test.app).get(`/api/v1/posts/${test.post.slug}`)
      .set("Authorization", `Bearer ${await test.tokenFor(test.outsider)}`).expect(200);
    expect(outsiderDetail.body.data.post.author).toMatchObject({ followerCount: 2, viewerIsFollowing: false });

    const unfollow = await request(test.app).delete(`/api/v1/users/${test.owner.id}/followers/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(unfollow.body.data).toMatchObject({ userId: test.owner.id, following: false, followerCount: 1 });
    const repeatedUnfollow = await request(test.app).delete(`/api/v1/users/${test.owner.id}/followers/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(200);
    expect(repeatedUnfollow.body.data).toMatchObject({ following: false, followerCount: 1 });

    const selfFollow = await request(test.app).put(`/api/v1/users/${test.alice.id}/followers/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(422);
    expect(selfFollow.body.error.code).toBe("CANNOT_FOLLOW_SELF");
    const missingUser = await request(test.app).put(`/api/v1/users/${randomUUID()}/followers/me`)
      .set("Authorization", `Bearer ${aliceToken}`).expect(404);
    expect(missingUser.body.error.code).toBe("USER_NOT_FOUND");
  });
});
