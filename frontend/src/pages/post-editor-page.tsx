import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useController, useForm } from "react-hook-form";
import { z } from "zod";
import { blogApi, type Category, type PostDetail } from "../api/blog-api";
import { FormField } from "../components/form-field";
import { RichTextEditor } from "../components/rich-text-editor";
import { SiteLayout } from "../components/site-layout";
import { Link, useNavigate } from "../router";
import { compactText, getApiErrorMessage } from "../utils/post-utils";

const editorSchema = z.object({
  title: z.string().trim().min(10, "Tiêu đề cần có ít nhất 10 ký tự.").max(200, "Tiêu đề tối đa 200 ký tự."),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục."),
  cropName: z.string().trim().max(100, "Tên cây trồng tối đa 100 ký tự."),
  excerpt: z.string().trim().max(500, "Mô tả ngắn tối đa 500 ký tự."),
  contentHtml: z.string().max(50000, "Nội dung bài viết quá dài.")
});

type EditorValues = z.infer<typeof editorSchema>;

const emptyValues: EditorValues = {
  title: "",
  categoryId: "",
  cropName: "",
  excerpt: "",
  contentHtml: ""
};

function asEditorValues(post: PostDetail): EditorValues {
  return {
    title: post.title,
    categoryId: post.category.id,
    cropName: post.cropName ?? "",
    excerpt: post.excerpt ?? "",
    contentHtml: post.contentHtml
  };
}

function optionalValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function PostEditorPage({ postId }: { postId?: string }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveIntent, setSaveIntent] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [loadError, setLoadError] = useState("");
  const [serverError, setServerError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: emptyValues
  });
  const { field: contentField } = useController({ control, name: "contentHtml" });

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError("");
    setServerError("");
    const postRequest = postId ? blogApi.getMyPost(postId) : Promise.resolve(null);
    void Promise.all([blogApi.getCategories(), postRequest])
      .then(([categoryItems, post]) => {
        if (!active) return;
        setCategories(categoryItems);
        reset(post ? asEditorValues(post) : emptyValues);
      })
      .catch((requestError: unknown) => {
        if (active) setLoadError(getApiErrorMessage(requestError, postId ? "Không thể mở bài viết để chỉnh sửa." : "Không thể tải danh mục bài viết."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [postId, reset]);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [isDirty]);

  const submitWithStatus = async (status: "DRAFT" | "PUBLISHED") => {
    setServerError("");
    setSaveIntent(status);
    await handleSubmit(async (values) => {
      if (status === "PUBLISHED" && !compactText(values.contentHtml)) {
        setError("contentHtml", { type: "manual", message: "Vui lòng viết nội dung trước khi xuất bản." });
        return;
      }
      const input = {
        title: values.title.trim(),
        categoryId: values.categoryId,
        cropName: optionalValue(values.cropName),
        excerpt: optionalValue(values.excerpt),
        contentHtml: values.contentHtml.trim(),
        status
      };
      try {
        const saved = postId ? await blogApi.updatePost(postId, input) : await blogApi.createPost(input);
        navigate(status === "PUBLISHED" ? `/posts/${encodeURIComponent(saved.slug)}` : "/me/posts", { replace: true });
      } catch (requestError) {
        setServerError(getApiErrorMessage(requestError, "Không thể lưu bài viết. Vui lòng thử lại."));
      }
    })();
    setSaveIntent(null);
  };

  const cancel = () => {
    if (isDirty && !window.confirm("Bạn có thay đổi chưa lưu. Rời trang mà không lưu?")) return;
    navigate(postId ? "/me/posts" : "/posts");
  };

  const removePost = async () => {
    if (!postId || !window.confirm("Xóa bài viết này? Hành động này không thể hoàn tác từ giao diện.")) return;
    setServerError("");
    setIsDeleting(true);
    try {
      await blogApi.deletePost(postId);
      navigate("/me/posts", { replace: true });
    } catch (requestError) {
      setServerError(getApiErrorMessage(requestError, "Không thể xóa bài viết."));
    } finally {
      setIsDeleting(false);
    }
  };

  const isBusy = isLoading || isSubmitting || isDeleting;

  return (
    <SiteLayout>
      <section className="editor-page">
        <div className="editor-page__heading">
          <div><p className="eyebrow">{postId ? "Chỉnh sửa nội dung" : "Chia sẻ cùng cộng đồng"}</p><h1>{postId ? "Chỉnh sửa bài viết" : "Viết bài mới"}</h1><p>{postId ? "Cập nhật kinh nghiệm của bạn rồi lưu nháp hoặc xuất bản lại." : "Ghi lại cách làm, kết quả và bài học từ mùa vụ thực tế."}</p></div>
          <Link to="/me/posts">← Bài viết của tôi</Link>
        </div>
        {isLoading ? <EditorSkeleton /> : loadError ? (
          <div className="page-state page-state--error" role="alert"><p>{loadError}</p><Link className="button button--ghost" to={postId ? "/me/posts" : "/posts"}>Quay lại</Link></div>
        ) : (
          <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void submitWithStatus("PUBLISHED"); }} noValidate>
            {serverError && <div className="form-alert" role="alert">{serverError}</div>}
            <div className="editor-form__main">
              <FormField label="Tiêu đề bài viết" placeholder="Ví dụ: Kinh nghiệm xử lý sâu cuốn lá trên lúa" registration={register("title")} error={errors.title?.message} disabled={isBusy} />
              <div className="form-field">
                <label htmlFor="categoryId">Danh mục</label>
                <select id="categoryId" {...register("categoryId")} aria-invalid={Boolean(errors.categoryId)} aria-describedby={errors.categoryId ? "categoryId-error" : undefined} disabled={isBusy}>
                  <option value="">Chọn danh mục phù hợp</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {errors.categoryId?.message && <span className="field-error" id="categoryId-error">{errors.categoryId.message}</span>}
              </div>
              <FormField label="Cây trồng (không bắt buộc)" placeholder="Ví dụ: Lúa, cà phê, rau cải…" registration={register("cropName")} error={errors.cropName?.message} disabled={isBusy} />
              <div className="form-field">
                <label htmlFor="excerpt">Mô tả ngắn (không bắt buộc)</label>
                <textarea id="excerpt" rows={3} placeholder="Tóm tắt điều người đọc sẽ học được từ bài viết…" {...register("excerpt")} aria-invalid={Boolean(errors.excerpt)} aria-describedby={errors.excerpt ? "excerpt-error" : undefined} disabled={isBusy} />
                {errors.excerpt?.message && <span className="field-error" id="excerpt-error">{errors.excerpt.message}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="contentHtml">Nội dung bài viết</label>
                <RichTextEditor id="contentHtml" value={contentField.value} onChange={contentField.onChange} error={errors.contentHtml?.message} disabled={isBusy} />
              </div>
            </div>
            <aside className="editor-form__aside">
              <div className="editor-tips"><h2>Mẹo cho bài viết hữu ích</h2><ul><li>Nêu rõ bối cảnh canh tác và cây trồng.</li><li>Chia sẻ các bước bạn đã thực hiện.</li><li>Ghi lại kết quả và bài học thực tế.</li></ul></div>
              <div className="editor-actions">
                <button className="button button--primary" type="submit" disabled={isBusy}>{saveIntent === "PUBLISHED" ? "Đang xuất bản…" : "Xuất bản bài viết"}</button>
                <button className="button button--ghost" type="button" disabled={isBusy} onClick={() => void submitWithStatus("DRAFT")}>{saveIntent === "DRAFT" ? "Đang lưu…" : "Lưu bản nháp"}</button>
                <button className="button button--text" type="button" disabled={isBusy} onClick={cancel}>Hủy</button>
                {postId && <button className="button button--danger" type="button" disabled={isBusy} onClick={() => void removePost()}>{isDeleting ? "Đang xóa…" : "Xóa bài viết"}</button>}
              </div>
            </aside>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}

function EditorSkeleton() {
  return <div className="editor-form editor-form--skeleton" aria-label="Đang tải trình soạn thảo"><div><span /><span /><span /><span /></div><aside><span /><span /></aside></div>;
}
