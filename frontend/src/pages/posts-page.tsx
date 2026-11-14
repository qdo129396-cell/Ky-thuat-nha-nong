import { useEffect, useMemo, useState } from "react";
import { blogApi, type Category, type PaginatedResult, type PostListQuery, type PostSort, type PostSummary } from "../api/blog-api";
import { PostCard } from "../components/post-card";
import { Pagination } from "../components/pagination";
import { SiteLayout } from "../components/site-layout";
import { Link, useNavigate, useSearchParams } from "../router";
import { getApiErrorMessage } from "../utils/post-utils";

const pageLimit = 10;

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseSort(value: string | null): PostSort {
  return value === "popular" ? "popular" : "latest";
}

function toPostsPath(query: PostListQuery): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.category) params.set("category", query.category);
  if (query.sort && query.sort !== "latest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `/posts?${search}` : "/posts";
}

export function PostsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = useMemo<PostListQuery>(() => ({
    q: searchParams.get("q") ?? "",
    category: searchParams.get("category") ?? "",
    sort: parseSort(searchParams.get("sort")),
    page: parsePage(searchParams.get("page")),
    limit: pageLimit
  }), [searchParams]);
  const [search, setSearch] = useState(query.q ?? "");
  const [category, setCategory] = useState(query.category ?? "");
  const [sort, setSort] = useState<PostSort>(query.sort ?? "latest");
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<PaginatedResult<PostSummary> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearch(query.q ?? "");
    setCategory(query.category ?? "");
    setSort(query.sort ?? "latest");
  }, [query.q, query.category, query.sort]);

  useEffect(() => {
    let active = true;
    void blogApi.getCategories()
      .then((items) => { if (active) setCategories(items); })
      .catch(() => { if (active) setCategories([]); });
    return () => { active = false; };
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await blogApi.getPosts(query);
      setResult(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải danh sách bài viết. Vui lòng thử lại."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, [query.q, query.category, query.page, query.sort]);

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(toPostsPath({ q: search, category, sort, page: 1 }));
  };

  const selectedCategory = categories.find((item) => item.slug === query.category);

  return (
    <SiteLayout>
      <section className="page-hero page-hero--compact">
        <div>
          <p className="eyebrow">Kho tri thức cộng đồng</p>
          <h1>Bài viết chia sẻ kỹ thuật</h1>
          <p>Tìm kinh nghiệm canh tác theo chủ đề, cây trồng và những câu chuyện thực tế từ cộng đồng.</p>
        </div>
        <Link className="button button--primary" to="/posts/new">+ Viết bài</Link>
      </section>

      <section className="posts-browser" aria-label="Tìm kiếm bài viết">
        <form className="post-filters" onSubmit={applyFilters}>
          <div className="filter-field filter-field--search">
            <label htmlFor="post-search">Từ khóa</label>
            <input id="post-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kỹ thuật, cây trồng…" />
          </div>
          <div className="filter-field">
            <label htmlFor="post-category">Danh mục</label>
            <select id="post-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Tất cả danh mục</option>
              {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="post-sort">Sắp xếp</label>
            <select id="post-sort" value={sort} onChange={(event) => setSort(event.target.value as PostSort)}>
              <option value="latest">Mới nhất</option>
              <option value="popular">Phổ biến</option>
            </select>
          </div>
          <button className="button button--primary" type="submit">Lọc bài viết</button>
        </form>

        <div className="posts-browser__body">
          <aside className="category-sidebar" aria-label="Lọc theo danh mục">
            <h2>Danh mục</h2>
            <Link className={!query.category ? "is-active" : ""} to={toPostsPath({ q: query.q, sort: query.sort })}>Tất cả</Link>
            {categories.map((item) => <Link key={item.id} className={item.slug === query.category ? "is-active" : ""}
              to={toPostsPath({ q: query.q, category: item.slug, sort: query.sort })}>{item.name}</Link>)}
          </aside>
          <div className="posts-results">
            <div className="posts-results__heading">
              <div>
                <h2>{selectedCategory ? selectedCategory.name : "Tất cả bài viết"}</h2>
                {!isLoading && result && <p>{result.meta.totalItems.toLocaleString("vi-VN")} kết quả{query.q ? ` cho “${query.q}”` : ""}</p>}
              </div>
              {query.q || query.category ? <Link to="/posts">Xóa bộ lọc</Link> : null}
            </div>
            {isLoading ? <PostsSkeleton /> : error ? (
              <div className="page-state page-state--error" role="alert"><p>{error}</p><button className="button button--ghost" type="button" onClick={() => void loadPosts()}>Thử lại</button></div>
            ) : result?.items.length ? (
              <>
                <div className="post-list">{result.items.map((post) => <PostCard key={post.id} post={post} />)}</div>
                <Pagination meta={result.meta} createHref={(page) => toPostsPath({ ...query, page })} />
              </>
            ) : (
              <div className="page-state"><h3>Không tìm thấy bài viết phù hợp</h3><p>Thử đổi từ khóa hoặc chọn một danh mục khác.</p><Link className="button button--ghost" to="/posts">Xem tất cả bài viết</Link></div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function PostsSkeleton() {
  return <div className="post-list" aria-label="Đang tải bài viết">{Array.from({ length: 4 }, (_, index) => <div className="post-card post-card--skeleton" key={index}><span /><strong /><p /><small /></div>)}</div>;
}
