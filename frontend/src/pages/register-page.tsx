import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "../router";
import { z } from "zod";
import { authApi } from "../api/auth-api";
import { ApiError } from "../api/http";
import { AuthLayout } from "../components/auth-layout";
import { FormField } from "../components/form-field";

const passwordSchema = z.string().min(8, "Tối thiểu 8 ký tự.").max(128)
  .regex(/[A-Za-zÀ-ỹ]/, "Cần ít nhất một chữ cái.")
  .regex(/[0-9]/, "Cần ít nhất một chữ số.");
const schema = z.object({
  fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự.").max(100),
  email: z.string().trim().email("Email không đúng định dạng."),
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((value) => value, "Bạn cần đồng ý điều khoản.")
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Mật khẩu xác nhận không khớp."
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", acceptTerms: false }
  });

  const submit = handleSubmit(async ({ fullName, email, password }) => {
    setServerError("");
    try {
      await authApi.register({ fullName, email, password });
      setSuccess(true);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Không thể tạo tài khoản.");
    }
  });

  if (success) {
    return (
      <AuthLayout title="Tạo tài khoản thành công" subtitle="Hồ sơ nhà nông của bạn đã sẵn sàng.">
        <div className="success-panel" role="status">
          <span aria-hidden="true">✓</span>
          <p>Bạn có thể đăng nhập và bắt đầu xây dựng hồ sơ chuyên môn.</p>
          <Link className="button button--primary" to="/login">Đến trang đăng nhập</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Tham gia cộng đồng chia sẻ tri thức nông nghiệp.">
      <form className="auth-form" onSubmit={submit} noValidate>
        {serverError && <div className="form-alert" role="alert">{serverError}</div>}
        <FormField label="Họ và tên" autoComplete="name" registration={register("fullName")}
          error={errors.fullName?.message} />
        <FormField label="Email" type="email" autoComplete="email" registration={register("email")}
          error={errors.email?.message} />
        <FormField label="Mật khẩu" type="password" autoComplete="new-password" registration={register("password")}
          error={errors.password?.message} />
        <FormField label="Xác nhận mật khẩu" type="password" autoComplete="new-password"
          registration={register("confirmPassword")} error={errors.confirmPassword?.message} />
        <label className="checkbox-field">
          <input type="checkbox" {...register("acceptTerms")} />
          <span>Tôi đồng ý với điều khoản sử dụng và chính sách cộng đồng.</span>
        </label>
        {errors.acceptTerms?.message && <span className="field-error">{errors.acceptTerms.message}</span>}
        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo tài khoản…" : "Đăng ký"}
        </button>
      </form>
      <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </AuthLayout>
  );
}
