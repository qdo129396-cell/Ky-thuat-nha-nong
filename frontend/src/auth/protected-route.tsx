import type { ReactNode } from "react";
import { Navigate, useRouter } from "../router";
import { useAuth } from "./auth-context";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useRouter();
  if (isLoading) return <div className="page-loader" role="status">Đang kiểm tra phiên đăng nhập…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
