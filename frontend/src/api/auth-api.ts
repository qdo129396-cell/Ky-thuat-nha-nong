import { apiRequest, setAccessToken, type AuthSession, type AuthUser } from "./http";

export const authApi = {
  async register(input: { fullName: string; email: string; password: string }): Promise<AuthUser> {
    const data = await apiRequest<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
    return data.user;
  },

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const session = await apiRequest<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    }, false);
    setAccessToken(session.accessToken);
    return session;
  },

  async logout(): Promise<void> {
    await apiRequest<void>("/auth/logout", { method: "POST" }, false);
    setAccessToken(null);
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    }, false);
  },

  resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword })
    }, false);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const result = await apiRequest<{ message: string }>("/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setAccessToken(null);
    return result;
  }
};

