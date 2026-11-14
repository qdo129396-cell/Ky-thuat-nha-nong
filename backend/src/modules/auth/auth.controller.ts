import type { CookieOptions, Request, Response } from "express";
import type { AuthService } from "./auth.service.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from "./auth.validation.js";

const refreshCookieName = "refreshToken";

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly isProduction: boolean,
    private readonly refreshTokenTtlDays: number
  ) {}

  register = async (request: Request, response: Response): Promise<void> => {
    const user = await this.authService.register(registerSchema.parse(request.body));
    response.status(201).json({ success: true, data: { user }, requestId: request.id });
  };

  login = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.login(loginSchema.parse(request.body), this.context(request));
    this.setRefreshCookie(response, result.refreshToken);
    response.json({
      success: true,
      data: { accessToken: result.accessToken, user: result.user },
      requestId: request.id
    });
  };

  refresh = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.refresh(request.cookies[refreshCookieName], this.context(request));
    this.setRefreshCookie(response, result.refreshToken);
    response.json({
      success: true,
      data: { accessToken: result.accessToken, user: result.user },
      requestId: request.id
    });
  };

  logout = async (request: Request, response: Response): Promise<void> => {
    await this.authService.logout(request.cookies[refreshCookieName]);
    response.clearCookie(refreshCookieName, this.cookieOptions());
    response.status(204).send();
  };

  logoutAll = async (request: Request, response: Response): Promise<void> => {
    await this.authService.logoutAll(request.auth!.userId);
    response.clearCookie(refreshCookieName, this.cookieOptions());
    response.status(204).send();
  };

  forgotPassword = async (request: Request, response: Response): Promise<void> => {
    const { email } = forgotPasswordSchema.parse(request.body);
    await this.authService.forgotPassword(email);
    response.json({
      success: true,
      data: { message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi." },
      requestId: request.id
    });
  };

  resetPassword = async (request: Request, response: Response): Promise<void> => {
    const input = resetPasswordSchema.parse(request.body);
    await this.authService.resetPassword(input.token, input.newPassword);
    response.json({
      success: true,
      data: { message: "Mật khẩu đã được đặt lại. Vui lòng đăng nhập." },
      requestId: request.id
    });
  };

  changePassword = async (request: Request, response: Response): Promise<void> => {
    const input = changePasswordSchema.parse(request.body);
    await this.authService.changePassword(request.auth!.userId, input.currentPassword, input.newPassword);
    response.clearCookie(refreshCookieName, this.cookieOptions());
    response.json({
      success: true,
      data: { message: "Mật khẩu đã đổi. Vui lòng đăng nhập lại trên các thiết bị." },
      requestId: request.id
    });
  };

  me = async (request: Request, response: Response): Promise<void> => {
    const user = await this.authService.getMe(request.auth!.userId);
    response.json({ success: true, data: { user }, requestId: request.id });
  };

  private context(request: Request): { userAgent?: string; ipAddress?: string } {
    const userAgent = request.get("user-agent");
    return {
      ...(userAgent ? { userAgent } : {}),
      ...(request.ip ? { ipAddress: request.ip } : {})
    };
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(refreshCookieName, token, {
      ...this.cookieOptions(),
      maxAge: this.refreshTokenTtlDays * 86_400_000
    });
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: "lax",
      path: "/api/v1/auth"
    };
  }
}

