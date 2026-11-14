import { Link } from "../router";

export function NotFoundPage() {
  return <main className="not-found"><p className="eyebrow">404</p><h1>Không tìm thấy trang</h1>
    <Link className="button button--primary" to="/">Về trang chủ</Link></main>;
}
