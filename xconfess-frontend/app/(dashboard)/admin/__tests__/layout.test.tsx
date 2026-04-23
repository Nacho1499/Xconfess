/**
 * Regression tests for the admin layout dev-bypass guard.
 *
 * Security requirement (issue #649):
 * - The localStorage "adminMock" toggle must no longer grant admin access.
 * - NEXT_PUBLIC_DEV_BYPASS_AUTH may only bypass auth when NODE_ENV === "development".
 * - In production-like builds (NODE_ENV !== "development"), bypass mode is always false.
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/dashboard",
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    setQueriesData: jest.fn(),
  }),
}));

jest.mock("socket.io-client", () => ({
  io: () => ({
    on: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

jest.mock("@/app/lib/api/constants", () => ({
  AUTH_TOKEN_KEY: "auth_token",
  USER_DATA_KEY: "user_data",
}));
jest.mock("@/app/lib/hooks/useFocusTrap", () => ({
  useFocusTrap: jest.fn(),
}));
jest.mock("@/app/lib/config", () => ({
  getApiBaseUrl: () => "http://localhost:5000",
}));

function setLocalStorage(key: string, value: string) {
  (window.localStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    k === key ? value : null,
  );
}

function clearLocalStorage() {
  (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
}

async function renderLayout() {
  const { default: AdminLayout } = await import("../layout");
  return render(<AdminLayout>content</AdminLayout>);
}

beforeEach(() => {
  jest.clearAllMocks();
  clearLocalStorage();
  delete process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH;
});

describe("isDevBypassEnabled - production guard", () => {
  it("is always false when NODE_ENV is not development", async () => {
    expect(process.env.NODE_ENV).not.toBe("development");
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH = "true";

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("localStorage 'adminMock' key is never checked", async () => {
    (window.localStorage.getItem as jest.Mock).mockImplementation((k: string) =>
      k === "adminMock" ? "true" : null,
    );

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("NEXT_PUBLIC_DEV_BYPASS_AUTH='true' without development NODE_ENV does not bypass auth", async () => {
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH = "true";
    clearLocalStorage();

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});

describe("Admin layout - authentication redirect behaviour", () => {
  it("redirects to /login when no user data is present in localStorage", async () => {
    clearLocalStorage();

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects to / when the stored user is not an admin", async () => {
    setLocalStorage(
      "user_data",
      JSON.stringify({ id: 2, username: "alice", isAdmin: false, is_active: true }),
    );

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(mockReplace).not.toHaveBeenCalledWith("/login");
  });

  it("does not redirect when the stored user is an admin", async () => {
    setLocalStorage(
      "user_data",
      JSON.stringify({ id: 1, username: "admin", isAdmin: true, is_active: true }),
    );

    await renderLayout();

    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });

  it("redirects to /login when stored user data is invalid JSON", async () => {
    setLocalStorage("user_data", "not-valid-json");

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not seed admin state into localStorage for any reason in non-mock mode", async () => {
    clearLocalStorage();

    await renderLayout();

    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });
});
