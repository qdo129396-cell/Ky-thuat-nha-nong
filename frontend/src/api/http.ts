const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<AuthSession | null> | null = null;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  slug: string;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "BLOCKED";
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  requestId: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: Array<{ field: string; message: string }> = []
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as SuccessResponse<T> | ErrorResponse;
  if (!response.ok || !body.success) {
    const error = body as ErrorResponse;
    throw new ApiError(
      error.error?.message ?? "Không thể kết nối đến máy chủ.",
      response.status,
      error.error?.code ?? "REQUEST_FAILED",
      error.error?.details ?? []
    );
  }
  return body.data;
}

export async function refreshAuth(): Promise<AuthSession | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    })
      .then(async (response) => {
        if (!response.ok) {
          setAccessToken(null);
          return null;
        }
        const session = await parseResponse<AuthSession>(response);
        setAccessToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });
  if (response.status === 401 && retryOnUnauthorized && accessToken) {
    const session = await refreshAuth();
    if (session) return apiRequest<T>(path, options, false);
  }
  return parseResponse<T>(response);
}

