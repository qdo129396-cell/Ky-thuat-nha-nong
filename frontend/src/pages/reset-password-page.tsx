import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "../router";
import { z } from "zod";
import { authApi } from "../api/auth-api";
import { ApiError } from "../api/http";
import { AuthLayout } from "../components/auth-layout";
import { FormField } from "../components/form-field";

const schema = z.object({
  newPassword: z.string().min(8, "Tối thiểu 8 ký tự.").regex(/[A-Za-zÀ-ỹ]/, "Cần ít nhất một chữ cái.").regex(/[0-9]/, "Cần ít nhất một chữ số."),
  confirmPassword: z.string()
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp."
});
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema), defaultValues: { newPassword: "", confirmPassword: "" }
  });

  const submit = handleSubmit(async ({ newPassword }) => {
    setServerError("");
    if (!token) return setServerError("Liên kết đặt lại mật khẩu không hợp lệ.");
    try {
      const result = await authApi.resetPassword(token, newPassword);
      setMessage(result.message);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Không thể đặt lại mật khẩu.");
    }
  });

  return (
    <AuthLayout title="Đặt mật khẩu mới" subtitle="Chọn mật khẩu mạnh và không dùng lại mật khẩu cũ.">
      {message ? (
        <div className="success-panel" role="status"><span aria-hidden="true">✓</span><p>{message}</p>
          <Link className="button button--primary" to="/login">Đăng nhập</Link></div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          {serverError && <div className="form-alert" role="alert">{serverError}</div>}
          <FormField label="Mật khẩu mới" type="password" autoComplete="new-password"
            registration={register("newPassword")} error={errors.newPassword?.message} />
          <FormField label="Xác nhận mật khẩu" type="password" autoComplete="new-password"
            registration={register("confirmPassword")} error={errors.confirmPassword?.message} />
          <button className="button button--primary" type="submit" disabled={isSubmitting || !token}>
            {isSubmitting ? "Đang cập nhật…" : "Đặt lại mật khẩu"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
