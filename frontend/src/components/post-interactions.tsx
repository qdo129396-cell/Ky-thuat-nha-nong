import { useState } from "react";
import { blogApi, type PostAuthor } from "../api/blog-api";
import { useAuth } from "../auth/auth-context";
import { Link, useRouter } from "../router";
import { getApiErrorMessage } from "../utils/post-utils";

interface PostActionsProps {
  postId: string;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  onLikeChange(liked: boolean, likeCount: number): void;
}

interface FollowButtonProps {
  author: PostAuthor;
  onFollowingChange(following: boolean, followerCount: number): void;
  className?: string;
}

function LoginLink({ className, children }: { className: string; children: React.ReactNode }) {
  const { pathname } = useRouter();
  return <Link className={className} to="/login" state={{ from: pathname }}>{children}</Link>;
}

export function PostActions({ postId, likeCount, commentCount, viewerHasLiked, onLikeChange }: PostActionsProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [error, setError] = useState("");

  const handleLike = async () => {
    if (isLiking) return;
    const previousLiked = viewerHasLiked;
    const previousCount = likeCount;
    const nextLiked = !previousLiked;
    const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));

    setIsLiking(true);
    setError("");
    onLikeChange(nextLiked, nextCount);
    try {
      const result = await blogApi.setPostLike(postId, nextLiked);
      onLikeChange(result.liked, result.likeCount);
    } catch (requestError) {
      onLikeChange(previousLiked, previousCount);
      setError(getApiErrorMessage(requestError, "Không thể cập nhật lượt thích. Vui lòng thử lại."));
    } finally {
      setIsLiking(false);
    }
  };

  const focusComments = () => {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("comment-body")?.focus(), 250);
  };

  return (
    <section className="article-social" aria-label="Tương tác bài viết">
      <div className="article-social__actions">
        {user ? (
          <button className={`social-action ${viewerHasLiked ? "is-active" : ""}`} type="button" aria-pressed={viewerHasLiked}
            disabled={isLiking} onClick={() => void handleLike()}>
            <span aria-hidden="true">♥</span> {viewerHasLiked ? "Đã thích" : "Thích"} <strong>{likeCount.toLocaleString("vi-VN")}</strong>
          </button>
        ) : (
          <LoginLink className="social-action" ><span aria-hidden="true">♥</span> Thích <strong>{likeCount.toLocaleString("vi-VN")}</strong></LoginLink>
        )}
        {user ? (
          <button className="social-action" type="button" onClick={focusComments}>
            <span aria-hidden="true">◌</span> Bình luận <strong>{commentCount.toLocaleString("vi-VN")}</strong>
          </button>
        ) : (
          <LoginLink className="social-action"><span aria-hidden="true">◌</span> Bình luận <strong>{commentCount.toLocaleString("vi-VN")}</strong></LoginLink>
        )}
      </div>
      {error && <p className="interaction-feedback" role="alert">{error}</p>}
    </section>
  );
}

export function FollowButton({ author, onFollowingChange, className = "" }: FollowButtonProps) {
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  if (user?.id === author.id) return null;

  const followLabel = author.viewerIsFollowing ? "Đang theo dõi" : "Theo dõi";
  const buttonClassName = `button button--ghost button--small follow-button ${author.viewerIsFollowing ? "is-active" : ""} ${className}`.trim();

  const handleFollow = async () => {
    if (isPending) return;
    const previousFollowing = author.viewerIsFollowing;
    const previousCount = author.followerCount;
    const nextFollowing = !previousFollowing;
    const nextCount = Math.max(0, previousCount + (nextFollowing ? 1 : -1));

    setIsPending(true);
    setError("");
    onFollowingChange(nextFollowing, nextCount);
    try {
      const result = await blogApi.setFollowing(author.id, nextFollowing);
      onFollowingChange(result.following, result.followerCount);
    } catch (requestError) {
      onFollowingChange(previousFollowing, previousCount);
      setError(getApiErrorMessage(requestError, "Không thể cập nhật trạng thái theo dõi. Vui lòng thử lại."));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="follow-control">
      {user ? (
        <button className={buttonClassName} type="button" aria-pressed={author.viewerIsFollowing}
          disabled={isPending} onClick={() => void handleFollow()}>
          {isPending ? "Đang cập nhật…" : followLabel}
        </button>
      ) : (
        <LoginLink className={buttonClassName}>{followLabel}</LoginLink>
      )}
      {error && <p className="interaction-feedback" role="alert">{error}</p>}
    </div>
  );
}
