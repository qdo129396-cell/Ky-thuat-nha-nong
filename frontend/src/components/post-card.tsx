import type { PostSummary } from "../api/blog-api";
import { Link } from "../router";
import { formatPostDate, postStatusLabel } from "../utils/post-utils";

interface PostCardProps {
  post: PostSummary;
  href?: string;
  showStatus?: boolean;
}

export function PostCard({ post, href = `/posts/${encodeURIComponent(post.slug)}`, showStatus = false }: PostCardProps) {
  const publishedLabel = post.publishedAt ? formatPostDate(post.publishedAt) : `Cập nhật ${formatPostDate(post.updatedAt)}`;

  return (
    <article className="post-card">
      <div className="post-card__topline">
        <span className="post-category">{post.category.name}</span>
        {post.cropName && <span className="post-crop">{post.cropName}</span>}
        {showStatus && <span className={`status-badge status-badge--${post.status.toLowerCase()}`}>{postStatusLabel(post.status)}</span>}
      </div>
      <h2><Link to={href}>{post.title}</Link></h2>
      {post.excerpt && <p className="post-card__excerpt">{post.excerpt}</p>}
      <footer className="post-card__footer">
        <span className="author-chip" aria-label={`Tác giả ${post.author.fullName}`}>
          <span className="avatar-fallback" aria-hidden="true">{post.author.fullName.slice(0, 1).toLocaleUpperCase("vi-VN")}</span>
          <span>{post.author.fullName}</span>
        </span>
        <span>{publishedLabel}</span>
        {post.viewCount > 0 && <span>{post.viewCount.toLocaleString("vi-VN")} lượt xem</span>}
        <span className="post-card__stats" aria-label={`${post.likeCount.toLocaleString("vi-VN")} lượt thích và ${post.commentCount.toLocaleString("vi-VN")} bình luận`}>
          <span aria-hidden="true">♥</span> {post.likeCount.toLocaleString("vi-VN")}
          <span aria-hidden="true">•</span>
          <span aria-hidden="true">◌</span> {post.commentCount.toLocaleString("vi-VN")}
        </span>
      </footer>
    </article>
  );
}
