import type { PageMeta } from "../api/blog-api";
import { Link } from "../router";
import { pageNumbers } from "../utils/post-utils";

interface PaginationProps {
  meta: PageMeta;
  createHref(page: number): string;
}

export function Pagination({ meta, createHref }: PaginationProps) {
  if (meta.totalPages <= 1) return null;
  const pages = pageNumbers(meta);
  return (
    <nav className="pagination" aria-label="Phân trang bài viết">
      {meta.page > 1 ? <Link className="pagination__button" to={createHref(meta.page - 1)}>← Trước</Link>
        : <span className="pagination__button pagination__button--disabled">← Trước</span>}
      <div className="pagination__pages">
        {pages.map((page) => (
          <Link key={page} className={`pagination__button ${page === meta.page ? "is-active" : ""}`} to={createHref(page)} aria-current={page === meta.page ? "page" : undefined}>
            {page}
          </Link>
        ))}
      </div>
      {meta.page < meta.totalPages ? <Link className="pagination__button" to={createHref(meta.page + 1)}>Sau →</Link>
        : <span className="pagination__button pagination__button--disabled">Sau →</span>}
    </nav>
  );
}
