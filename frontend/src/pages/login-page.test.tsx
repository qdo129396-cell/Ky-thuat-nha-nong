import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/auth-context";
import { LoginPage } from "./login-page";
import { RouterProvider } from "../router";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: "REFRESH_TOKEN_REQUIRED", message: "Chưa đăng nhập" },
      requestId: "test"
    }), { status: 401, headers: { "content-type": "application/json" } })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("hiển thị lỗi tại trường khi submit form rỗng", async () => {
    render(<RouterProvider initialPath="/login"><AuthProvider><LoginPage /></AuthProvider></RouterProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByText("Email không đúng định dạng.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
