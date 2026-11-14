import { useState, type ReactNode } from "react";
import { useAuth } from "../auth/auth-context";
import { Link, useNavigate, useRouter } from "../router";

interface SiteLayoutProps {
  children: ReactNode;
}

function isActive(pathname: string, target: string): boolean {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function SiteLayout({ children }: SiteLayoutProps) {
  const { user, isLoading, logout } = useAuth();
  const { pathname } = useRouter();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/posts?q=${encodeURIComponent(query)}` : "/posts");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link className="brand" to="/">Nông Kỳ</Link>
          <nav className="primary-nav" aria-label="Điều hướng chính">
            <Link className={isActive(pathname, "/") ? "is-active" : ""} to="/">Trang chủ</Link>
            <Link className={isActive(pathname, "/posts") ? "is-active" : ""} to="/posts">Bài viết</Link>
            {user && <Link className={isActive(pathname, "/me/posts") ? "is-active" : ""} to="/me/posts">Bài của tôi</Link>}
          </nav>
          <form className="header-search" role="search" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="site-search">Tìm bài viết</label>
            <input id="site-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kỹ thuật, cây trồng…" />
            <button type="submit" aria-label="Tìm kiếm">Tìm</button>
          </form>
          <div className="header-actions">
            {!isLoading && (user ? (
              <>
                <Link className="button button--primary button--small" to="/posts/new">Viết bài</Link>
                <span className="header-user" title={user.email}>Chào, {user.fullName}</span>
                <button className="button button--ghost button--small" type="button" onClick={() => void handleLogout()}>Đăng xuất</button>
              </>
            ) : (
              <>
                <Link to="/login">Đăng nhập</Link>
                <Link className="button button--primary button--small" to="/register">Đăng ký</Link>
              </>
            ))}
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
      {user && (
        <nav className="mobile-nav" aria-label="Điều hướng nhanh">
          <Link className={isActive(pathname, "/") ? "is-active" : ""} to="/"><span aria-hidden="true">⌂</span>Trang chủ</Link>
          <Link className={isActive(pathname, "/posts") ? "is-active" : ""} to="/posts"><span aria-hidden="true">▤</span>Bài viết</Link>
          <Link className={isActive(pathname, "/posts/new") ? "is-active" : ""} to="/posts/new"><span aria-hidden="true">✎</span>Viết bài</Link>
          <Link className={isActive(pathname, "/me/posts") ? "is-active" : ""} to="/me/posts"><span aria-hidden="true">◉</span>Của tôi</Link>
        </nav>
      )}
      <footer className="app-footer"><span>Nông Kỳ · Cộng đồng chia sẻ kỹ thuật canh tác</span><span>Không mua bán · Không thanh toán</span></footer>
    </div>
  );
}
