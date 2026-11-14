import { useEffect, useState } from "react";
import { blogApi, type BlogComment } from "../api/blog-api";
import { useAuth } from "../auth/auth-context";
import { Link, useRouter } from "../router";
import { formatPostDate, getApiErrorMessage } from "../utils/post-utils";

interface CommentsSectionProps {
  postId: string;
  commentCount: number;
  onCommentCountChange(delta: number): void;
}

interface CommentComposerProps {
  initialValue?: string;
  submitLabel: string;
  onSubmit(body: string): Promise<void>;
  onCancel?(): void;
  id?: string;
}

function replaceComment(items: BlogComment[], updated: BlogComment): BlogComment[] {
  return items.map((comment) => {
    if (comment.id === updated.id) {
      return { ...updated, replies: updated.replies.length ? updated.replies : comment.replies };
    }
    return { ...comment, replies: replaceComment(comment.replies, updated) };
  });
}

function addReply(items: BlogComment[], parentId: string, reply: BlogComment): BlogComment[] {
  return items.map((comment) => {
    if (comment.id === parentId) return { ...comment, replies: [...comment.replies, reply] };
    return { ...comment, replies: addReply(comment.replies, parentId, reply) };
  });
}

function markCommentDeleted(items: BlogComment[], commentId: string): BlogComment[] {
  return items.map((comment) => {
    if (comment.id === commentId) {
      return {
        ...comment,
        body: "Bình luận này đã bị xóa.",
        isDeleted: true,
        canEdit: false
      };
    }
    return { ...comment, replies: markCommentDeleted(comment.replies, commentId) };
  });
}

function avatarInitial(fullName: string): string {
  return fullName.slice(0, 1).toLocaleUpperCase("vi-VN");
}

export function CommentsSection({ postId, commentCount, onCommentCountChange }: CommentsSectionProps) {
  const { user } = useAuth();
  const { pathname } = useRouter();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadComments = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setComments(await blogApi.getComments(postId));
    } catch (requestError) {
      setLoadError(getApiErrorMessage(requestError, "Không thể tải bình luận. Vui lòng thử lại."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadComments();
  }, [postId]);

  const createComment = async (body: string, parentId?: string): Promise<void> => {
    setActionError("");
    try {
      const comment = await blogApi.createComment(postId, { body, ...(parentId ? { parentId } : {}) });
      setComments((current) => parentId ? addReply(current, parentId, comment) : [comment, ...current]);
      onCommentCountChange(1);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Không thể gửi bình luận. Vui lòng thử lại.");
      setActionError(message);
      throw new Error(message);
    }
  };

  const updateComment = async (commentId: string, body: string): Promise<void> => {
    setActionError("");
    try {
      const comment = await blogApi.updateComment(commentId, body);
      setComments((current) => replaceComment(current, comment));
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Không thể sửa bình luận. Vui lòng thử lại.");
      setActionError(message);
      throw new Error(message);
    }
  };

  const deleteComment = async (commentId: string): Promise<void> => {
    setActionError("");
    try {
      await blogApi.deleteComment(commentId);
      setComments((current) => markCommentDeleted(current, commentId));
      onCommentCountChange(-1);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Không thể xóa bình luận. Vui lòng thử lại.");
      setActionError(message);
      throw new Error(message);
    }
  };

  return (
    <section className="comments-section" id="comments" aria-labelledby="comments-heading">
      <div className="comments-section__heading">
        <div>
          <p className="eyebrow">Trao đổi cùng cộng đồng</p>
          <h2 id="comments-heading">Bình luận <span>{commentCount.toLocaleString("vi-VN")}</span></h2>
        </div>
      </div>

      {user ? (
        <CommentComposer id="comment-body" submitLabel="Gửi bình luận" onSubmit={(body) => createComment(body)} />
      ) : (
        <div className="comment-login-cta">
          <p>Đăng nhập để chia sẻ kinh nghiệm hoặc đặt câu hỏi với cộng đồng.</p>
          <Link className="button button--ghost button--small" to="/login" state={{ from: pathname }}>Đăng nhập để bình luận</Link>
        </div>
      )}

      {actionError && <p className="interaction-feedback" role="alert">{actionError}</p>}

      {isLoading ? <CommentsSkeleton /> : loadError ? (
        <div className="comments-state comments-state--error" role="alert">
          <p>{loadError}</p>
          <button className="button button--ghost button--small" type="button" onClick={() => void loadComments()}>Thử lại</button>
        </div>
      ) : comments.length ? (
        <div className="comment-list">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} depth={0} isAuthenticated={Boolean(user)} loginPathname={pathname}
              onReply={(body, parentId) => createComment(body, parentId)} onUpdate={updateComment} onDelete={deleteComment} />
          ))}
        </div>
      ) : (
        <div className="comments-state"><p>Chưa có bình luận nào. Hãy là người đầu tiên bắt đầu cuộc trao đổi.</p></div>
      )}
    </section>
  );
}

function CommentComposer({ initialValue = "", submitLabel, onSubmit, onCancel, id }: CommentComposerProps) {
  const [body, setBody] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = body.trim();
    if (!value) {
      setError("Vui lòng nhập nội dung bình luận.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(value);
      setBody("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể lưu bình luận. Vui lòng thử lại."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="comment-composer" onSubmit={(event) => void submit(event)}>
      <label className="sr-only" htmlFor={id}>Nội dung bình luận</label>
      <textarea id={id} value={body} maxLength={2000} rows={3} placeholder="Chia sẻ ý kiến hoặc câu hỏi của bạn…"
        onChange={(event) => setBody(event.target.value)} aria-invalid={Boolean(error)} />
      <div className="comment-composer__footer">
        <span>{body.trim().length.toLocaleString("vi-VN")}/2.000</span>
        <div>
          {onCancel && <button className="button button--ghost button--small" type="button" onClick={onCancel}>Hủy</button>}
          <button className="button button--primary button--small" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang gửi…" : submitLabel}
          </button>
        </div>
      </div>
      {error && <p className="comment-composer__error" role="alert">{error}</p>}
    </form>
  );
}

interface CommentItemProps {
  comment: BlogComment;
  depth: number;
  isAuthenticated: boolean;
  loginPathname: string;
  onReply(body: string, parentId: string): Promise<void>;
  onUpdate(commentId: string, body: string): Promise<void>;
  onDelete(commentId: string): Promise<void>;
}

function CommentItem({ comment, depth, isAuthenticated, loginPathname, onReply, onUpdate, onDelete }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const canReply = !comment.isDeleted && depth === 0;

  const deleteCurrentComment = async () => {
    if (isDeleting || !window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;
    setIsDeleting(true);
    setError("");
    try {
      await onDelete(comment.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể xóa bình luận. Vui lòng thử lại."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article className={`comment-item ${depth > 0 ? "comment-item--reply" : ""}`}>
      {comment.author.avatarUrl ? (
        <img className="comment-avatar" src={comment.author.avatarUrl} alt="" />
      ) : (
        <span className="avatar-fallback comment-avatar" aria-hidden="true">{avatarInitial(comment.author.fullName)}</span>
      )}
      <div className="comment-item__body">
        {isEditing ? (
          <CommentComposer initialValue={comment.body} submitLabel="Lưu thay đổi" onCancel={() => setIsEditing(false)}
            onSubmit={async (body) => {
              await onUpdate(comment.id, body);
              setIsEditing(false);
            }} />
        ) : (
          <>
            <div className={`comment-bubble ${comment.isDeleted ? "is-deleted" : ""}`}>
              <strong>{comment.author.fullName}</strong>
              <p>{comment.body}</p>
            </div>
            <div className="comment-item__meta">
              <span>{formatPostDate(comment.createdAt)}</span>
              {!comment.isDeleted && canReply && (isAuthenticated ? (
                <button type="button" onClick={() => setIsReplying((value) => !value)}>Trả lời</button>
              ) : (
                <Link to="/login" state={{ from: loginPathname }}>Đăng nhập để trả lời</Link>
              ))}
              {!comment.isDeleted && comment.canEdit && <button type="button" onClick={() => setIsEditing(true)}>Sửa</button>}
              {!comment.isDeleted && comment.canEdit && <button type="button" disabled={isDeleting} onClick={() => void deleteCurrentComment()}>
                {isDeleting ? "Đang xóa…" : "Xóa"}
              </button>}
            </div>
          </>
        )}
        {error && <p className="comment-composer__error" role="alert">{error}</p>}
        {isReplying && (
          <CommentComposer submitLabel="Gửi trả lời" onCancel={() => setIsReplying(false)} onSubmit={async (body) => {
            await onReply(body, comment.id);
            setIsReplying(false);
          }} />
        )}
        {comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} isAuthenticated={isAuthenticated} loginPathname={loginPathname}
                onReply={onReply} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function CommentsSkeleton() {
  return <div className="comment-list comment-list--skeleton" aria-label="Đang tải bình luận">
    {Array.from({ length: 3 }, (_, index) => <div className="comment-item" key={index}><span /><div><strong /><p /></div></div>)}
  </div>;
}
