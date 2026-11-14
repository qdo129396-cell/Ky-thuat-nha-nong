import { useEffect, useState } from "react";
import { blogApi, type PostDetail } from "../api/blog-api";
import { CommentsSection } from "../components/comments-section";
import { FollowButton, PostActions } from "../components/post-interactions";
import { SiteLayout } from "../components/site-layout";
import { Link } from "../router";
import { formatPostDate, getApiErrorMessage } from "../utils/post-utils";

export function PostDetailPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      setPost(await blogApi.getPostBySlug(slug));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải bài viết này."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [slug]);

  const updatePost = (updater: (current: PostDetail) => PostDetail) => {
    setPost((current) => current ? updater(current) : current);
  };

  return (
    <SiteLayout>
      {isLoading ? <ArticleSkeleton /> : error ? (
        <section className="page-state page-state--large page-state--error" role="alert">
          <h1>Không thể mở bài viết</h1>
          <p>{error}</p>
          <div className="inline-actions">
            <button className="button button--ghost" type="button" onClick={() => void load()}>Thử lại</button>
            <Link className="button button--primary" to="/posts">Quay lại bài viết</Link>
          </div>
        </section>
      ) : post ? <Article post={post} onPostUpdate={updatePost} /> : null}
    </SiteLayout>
  );
}

function Article({ post, onPostUpdate }: { post: PostDetail; onPostUpdate(updater: (current: PostDetail) => PostDetail): void }) {
  const updateAuthorFollowing = (following: boolean, followerCount: number) => {
    onPostUpdate((current) => ({
      ...current,
      author: { ...current.author, viewerIsFollowing: following, followerCount }
    }));
  };

  return (
    <article className="article-page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/posts">Bài viết</Link><span>/</span>
        <Link to={`/posts?category=${encodeURIComponent(post.category.slug)}`}>{post.category.name}</Link>
      </nav>
      <header className="article-header">
        <div className="article-header__labels">
          <span className="post-category">{post.category.name}</span>
          {post.cropName && <span className="post-crop">{post.cropName}</span>}
        </div>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="article-header__excerpt">{post.excerpt}</p>}
        <div className="article-byline">
          <span className="avatar-fallback" aria-hidden="true">{post.author.fullName.slice(0, 1).toLocaleUpperCase("vi-VN")}</span>
          <div>
            <strong>{post.author.fullName}</strong>
            <span>Xuất bản {formatPostDate(post.publishedAt)} · {post.viewCount.toLocaleString("vi-VN")} lượt xem</span>
          </div>
          {post.canEdit && <Link className="button button--ghost button--small" to={`/posts/${encodeURIComponent(post.id)}/edit`}>Chỉnh sửa bài viết</Link>}
        </div>
      </header>
      <div className="article-layout">
        <div className="article-content">
          {/* HTML is sanitized by the server before it is returned to the client. */}
          <div className="rich-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          <PostActions postId={post.id} likeCount={post.likeCount} commentCount={post.commentCount}
            viewerHasLiked={post.viewerHasLiked} onLikeChange={(liked, likeCount) => {
              onPostUpdate((current) => ({ ...current, viewerHasLiked: liked, likeCount }));
            }} />
          <CommentsSection postId={post.id} commentCount={post.commentCount} onCommentCountChange={(delta) => {
            onPostUpdate((current) => ({ ...current, commentCount: Math.max(0, current.commentCount + delta) }));
          }} />
        </div>
        <aside className="article-aside">
          <p className="eyebrow">Tác giả</p>
          <strong>{post.author.fullName}</strong>
          <p>Chia sẻ kinh nghiệm canh tác cùng cộng đồng Nông Kỳ.</p>
          <p className="article-aside__followers">{post.author.followerCount.toLocaleString("vi-VN")} người theo dõi</p>
          <FollowButton author={post.author} onFollowingChange={updateAuthorFollowing} />
          <Link to="/posts">← Khám phá thêm bài viết</Link>
        </aside>
      </div>
    </article>
  );
}

function ArticleSkeleton() {
  return <section className="article-page article-page--skeleton" aria-label="Đang tải bài viết"><span /><h1 /><p /><div /><div /></section>;
}
