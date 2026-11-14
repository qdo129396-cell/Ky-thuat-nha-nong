import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "../router";
import { z } from "zod";
import { authApi } from "../api/auth-api";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/auth-context";
import { FormField } from "../components/form-field";

const schema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
  newPassword: z.string().min(8, "Tối thiểu 8 ký tự.").regex(/[A-Za-zÀ-ỹ]/, "Cần ít nhất một chữ cái.").regex(/[0-9]/, "Cần ít nhất một chữ số."),
  confirmPassword: z.string()
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp."
});
type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" }
  });

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setServerError("");
    try {
      await authApi.changePassword(currentPassword, newPassword);
      await logout();
      navigate("/login", { replace: true, state: { message: "Đổi mật khẩu thành công." } });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Không thể đổi mật khẩu.");
    }
  });

  return (
    <main className="content-page">
      <div className="settings-card">
        <p className="eyebrow">Bảo mật tài khoản</p>
        <h1>Đổi mật khẩu</h1>
        <p>Sau khi đổi, bạn sẽ đăng xuất khỏi tất cả thiết bị.</p>
        <form className="auth-form" onSubmit={submit} noValidate>
          {serverError && <div className="form-alert" role="alert">{serverError}</div>}
          <FormField label="Mật khẩu hiện tại" type="password" autoComplete="current-password"
            registration={register("currentPassword")} error={errors.currentPassword?.message} />
          <FormField label="Mật khẩu mới" type="password" autoComplete="new-password"
            registration={register("newPassword")} error={errors.newPassword?.message} />
          <FormField label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password"
            registration={register("confirmPassword")} error={errors.confirmPassword?.message} />
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang cập nhật…" : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </main>
  );
}
