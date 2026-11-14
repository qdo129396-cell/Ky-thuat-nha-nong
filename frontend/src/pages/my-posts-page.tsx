import { useEffect, useState } from "react";
import { blogApi, type PaginatedResult, type PostSummary } from "../api/blog-api";
import { Pagination } from "../components/pagination";
import { PostCard } from "../components/post-card";
import { SiteLayout } from "../components/site-layout";
import { Link, useSearchParams } from "../router";
import { getApiErrorMessage } from "../utils/post-utils";

const pageLimit = 12;

function getPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function MyPostsPage() {
  const [searchParams] = useSearchParams();
  const page = getPage(searchParams.get("page"));
  const [result, setResult] = useState<PaginatedResult<PostSummary> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      setResult(await blogApi.getMyPosts({ page, limit: pageLimit }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải các bài viết của bạn."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  return (
    <SiteLayout>
      <section className="page-hero page-hero--compact">
        <div><p className="eyebrow">Không gian sáng tác</p><h1>Bài viết của tôi</h1><p>Quản lý các bản nháp và bài viết bạn đã xuất bản cho cộng đồng.</p></div>
        <Link className="button button--primary" to="/posts/new">+ Viết bài mới</Link>
      </section>
      <section className="my-posts-section">
        {isLoading ? <MyPostsSkeleton /> : error ? (
          <div className="page-state page-state--error" role="alert"><p>{error}</p><button className="button button--ghost" type="button" onClick={() => void load()}>Thử lại</button></div>
        ) : result?.items.length ? (
          <>
            <p className="results-count">{result.meta.totalItems.toLocaleString("vi-VN")} bài viết và bản nháp</p>
            <div className="post-list post-list--mine">
              {result.items.map((post) => <PostCard key={post.id} post={post} showStatus href={post.status === "PUBLISHED" ? `/posts/${encodeURIComponent(post.slug)}` : `/posts/${encodeURIComponent(post.id)}/edit`} />)}
            </div>
            <Pagination meta={result.meta} createHref={(nextPage) => nextPage > 1 ? `/me/posts?page=${nextPage}` : "/me/posts"} />
          </>
        ) : (
          <div className="page-state page-state--large"><h2>Bạn chưa có bài viết nào</h2><p>Ghi lại một kinh nghiệm từ mùa vụ của bạn để bắt đầu xây dựng hồ sơ chuyên môn.</p><Link className="button button--primary" to="/posts/new">Viết bài đầu tiên</Link></div>
        )}
      </section>
    </SiteLayout>
  );
}

function MyPostsSkeleton() {
  return <div className="post-list" aria-label="Đang tải bài viết của bạn">{Array.from({ length: 3 }, (_, index) => <div className="post-card post-card--skeleton" key={index}><span /><strong /><p /><small /></div>)}</div>;
}
