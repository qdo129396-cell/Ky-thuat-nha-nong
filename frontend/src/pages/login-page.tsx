import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useRouter } from "../router";
import { z } from "zod";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/auth-context";
import { AuthLayout } from "../components/auth-layout";
import { FormField } from "../components/form-field";

const schema = z.object({
  email: z.string().trim().email("Email không đúng định dạng."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu.")
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useRouter();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Không thể đăng nhập. Vui lòng thử lại.");
    }
  });

  return (
    <AuthLayout title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục chia sẻ kinh nghiệm canh tác.">
      <form className="auth-form" onSubmit={submit} noValidate>
        {serverError && <div className="form-alert" role="alert">{serverError}</div>}
        <FormField label="Email" type="email" autoComplete="email" placeholder="ban@example.com"
          registration={register("email")} error={errors.email?.message} />
        <FormField label="Mật khẩu" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu"
          registration={register("password")} error={errors.password?.message} />
        <div className="form-row form-row--end"><Link to="/forgot-password">Quên mật khẩu?</Link></div>
        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
      <p className="auth-switch">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
    </AuthLayout>
  );
}
