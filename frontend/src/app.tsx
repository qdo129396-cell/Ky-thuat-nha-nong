import { AuthProvider } from "./auth/auth-context";
import { ProtectedRoute } from "./auth/protected-route";
import { ChangePasswordPage } from "./pages/change-password-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { MyPostsPage } from "./pages/my-posts-page";
import { NotFoundPage } from "./pages/not-found-page";
import { PostDetailPage } from "./pages/post-detail-page";
import { PostEditorPage } from "./pages/post-editor-page";
import { PostsPage } from "./pages/posts-page";
import { RegisterPage } from "./pages/register-page";
import { ResetPasswordPage } from "./pages/reset-password-page";
import { RouterProvider, useRouter } from "./router";

function routeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function AppRoutes() {
  const { pathname } = useRouter();
  const editMatch = pathname.match(/^\/posts\/([^/]+)\/edit\/?$/);
  const postMatch = pathname.match(/^\/posts\/([^/]+)\/?$/);
  if (editMatch) return <ProtectedRoute><PostEditorPage postId={routeSegment(editMatch[1])} /></ProtectedRoute>;
  switch (pathname) {
    case "/": return <HomePage />;
    case "/posts": return <PostsPage />;
    case "/posts/new": return <ProtectedRoute><PostEditorPage /></ProtectedRoute>;
    case "/me/posts": return <ProtectedRoute><MyPostsPage /></ProtectedRoute>;
    case "/login": return <LoginPage />;
    case "/register": return <RegisterPage />;
    case "/forgot-password": return <ForgotPasswordPage />;
    case "/reset-password": return <ResetPasswordPage />;
    case "/change-password": return <ProtectedRoute><ChangePasswordPage /></ProtectedRoute>;
    default: return postMatch ? <PostDetailPage slug={routeSegment(postMatch[1])} /> : <NotFoundPage />;
  }
}

export function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </RouterProvider>
  );
}
