import type { ReactNode } from "react";
import { Link } from "../router";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Giới thiệu Nông Kỹ">
        <Link className="brand brand--light" to="/">Nông Kỹ</Link>
        <div>
          <p className="eyebrow">Tri thức từ mùa vụ thực tế</p>
          <h1>Cùng chia sẻ, cùng canh tác tốt hơn.</h1>
          <p>Kết nối kinh nghiệm nhà nông và xây dựng uy tín bằng những câu chuyện chân thực.</p>
        </div>
        <span className="auth-story__note">Cộng đồng kiến thức · Không mua bán</span>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <Link className="brand brand--mobile" to="/">Nông Kỹ</Link>
          <header>
            <p className="eyebrow">Nông Kỹ</p>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
