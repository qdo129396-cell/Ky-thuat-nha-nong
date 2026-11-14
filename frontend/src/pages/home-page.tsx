import { useEffect, useState } from "react";
import { blogApi, type Category, type PostSummary } from "../api/blog-api";
import { PostCard } from "../components/post-card";
import { SiteLayout } from "../components/site-layout";
import { useAuth } from "../auth/auth-context";
import { Link } from "../router";
import { getApiErrorMessage } from "../utils/post-utils";

export function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [postResult, categoryResult] = await Promise.all([
        blogApi.getPosts({ limit: 6, sort: "latest" }),
        blogApi.getCategories()
      ]);
      setPosts(postResult.items);
      setCategories(categoryResult);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải bài viết mới. Vui lòng thử lại."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <SiteLayout>
      <section className="home-hero">
        <div>
          <p className="eyebrow">Cộng đồng kỹ thuật canh tác</p>
          <h1>Gieo tri thức.<br />Gặt niềm tin.</h1>
          <p>Chia sẻ kinh nghiệm thực tế từ mỗi mùa vụ, cùng nhau canh tác tốt hơn và xây dựng uy tín bằng giá trị thật.</p>
          <div className="home-hero__actions">
            <Link className="button button--primary" to="/posts">Khám phá bài viết</Link>
            {user ? <Link className="button button--ghost" to="/posts/new">Viết bài chia sẻ</Link>
              : <Link className="button button--ghost" to="/register">Tham gia cộng đồng</Link>}
          </div>
        </div>
        <div className="home-hero__art" aria-hidden="true">
          <span className="home-hero__sun" />
          <span className="home-hero__field home-hero__field--one" />
          <span className="home-hero__field home-hero__field--two" />
          <div><strong>Chuyện thật từ ruộng vườn</strong><span>của cộng đồng Nông Kỳ</span></div>
        </div>
      </section>

      <section className="featured-categories" aria-labelledby="featured-categories-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Khám phá theo chủ đề</p><h2 id="featured-categories-heading">Danh mục nổi bật</h2></div>
          <Link to="/posts">Xem tất cả bài viết →</Link>
        </div>
        <div className="category-chips">
          {categories.map((category) => <Link key={category.id} className="category-chip" to={`/posts?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>)}
          {!isLoading && categories.length === 0 && <span className="muted-text">Danh mục sẽ sớm được cập nhật.</span>}
        </div>
      </section>

      <section className="home-latest" aria-labelledby="latest-posts-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Từ cộng đồng</p><h2 id="latest-posts-heading">Bài viết mới</h2></div>
          <Link to="/posts">Xem thêm →</Link>
        </div>
        {isLoading ? <PostGridSkeleton /> : error ? (
          <div className="page-state page-state--error" role="alert"><p>{error}</p><button className="button button--ghost" type="button" onClick={() => void load()}>Thử lại</button></div>
        ) : posts.length ? (
          <div className="post-grid">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
        ) : (
          <div className="page-state"><h3>Chưa có bài viết nào</h3><p>Hãy là người đầu tiên chia sẻ một kinh nghiệm canh tác hữu ích.</p>{user && <Link className="button button--primary" to="/posts/new">Viết bài đầu tiên</Link>}</div>
        )}
      </section>
    </SiteLayout>
  );
}

function PostGridSkeleton() {
  return <div className="post-grid" aria-label="Đang tải bài viết">{Array.from({ length: 3 }, (_, index) => <div className="post-card post-card--skeleton" key={index}><span /><strong /><p /><small /></div>)}</div>;
}
