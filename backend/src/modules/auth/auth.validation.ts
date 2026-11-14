import { z } from "zod";

const email = z.string().trim().email("Email không đúng định dạng.").max(255);
const password = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
  .max(128, "Mật khẩu không được quá 128 ký tự.")
  .regex(/[A-Za-zÀ-ỹ]/, "Mật khẩu phải có ít nhất một chữ cái.")
  .regex(/[0-9]/, "Mật khẩu phải có ít nhất một chữ số.");

export const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự.").max(100)
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Vui lòng nhập mật khẩu.").max(128)
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(32, "Token không hợp lệ.").max(256),
  newPassword: password
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại.").max(128),
  newPassword: password
});

