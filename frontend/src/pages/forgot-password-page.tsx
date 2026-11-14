import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "../router";
import { z } from "zod";
import { authApi } from "../api/auth-api";
import { ApiError } from "../api/http";
import { AuthLayout } from "../components/auth-layout";
import { FormField } from "../components/form-field";

const schema = z.object({ email: z.string().trim().email("Email không đúng định dạng.") });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema), defaultValues: { email: "" }
  });

  const submit = handleSubmit(async ({ email }) => {
    setServerError("");
    try {
      const result = await authApi.forgotPassword(email);
      setMessage(result.message);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Không thể gửi yêu cầu.");
    }
  });

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email để nhận hướng dẫn đặt lại mật khẩu.">
      {message ? (
        <div className="success-panel" role="status"><span aria-hidden="true">✓</span><p>{message}</p></div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          {serverError && <div className="form-alert" role="alert">{serverError}</div>}
          <FormField label="Email" type="email" autoComplete="email" registration={register("email")}
            error={errors.email?.message} />
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang gửi…" : "Gửi hướng dẫn"}
          </button>
        </form>
      )}
      <p className="auth-switch"><Link to="/login">← Quay lại đăng nhập</Link></p>
    </AuthLayout>
  );
}
