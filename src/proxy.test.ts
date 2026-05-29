import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, isPublicSharePathMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  isPublicSharePathMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/public-route", () => ({
  isPublicSharePath: isPublicSharePathMock,
}));

const { proxy } = await import("./proxy");

const SETTINGS_ROUTE_CASES = [
  { url: "http://localhost/en/settings", locale: "en" },
  { url: "http://localhost/en/settings/account", locale: "en" },
  { url: "http://localhost/en/settings/language", locale: "en" },
  { url: "http://localhost/en/settings/security", locale: "en" },
  { url: "http://localhost/ru/settings", locale: "ru" },
  { url: "http://localhost/ru/settings/account", locale: "ru" },
  { url: "http://localhost/ru/settings/language", locale: "ru" },
  { url: "http://localhost/ru/settings/security", locale: "ru" },
  { url: "http://localhost/es/settings", locale: "es" },
  { url: "http://localhost/es/settings/account", locale: "es" },
  { url: "http://localhost/es/settings/language", locale: "es" },
  { url: "http://localhost/es/settings/security", locale: "es" },
] as const;

describe("proxy locale and auth routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPublicSharePathMock.mockReturnValue(false);
    getSessionMock.mockResolvedValue(null);
  });

  it("uses authenticated user locale for non-prefixed routes", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", locale: "ru" } });

    const request = new NextRequest("http://localhost/settings/language", {
      headers: {
        "accept-language": "en-US,en;q=0.9",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/ru/settings/language",
    );
  });

  it("uses Spanish session locale for non-prefixed routes", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", locale: "es" } });

    const request = new NextRequest("http://localhost/settings/language", {
      headers: {
        "accept-language": "en-US,en;q=0.9",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/es/settings/language",
    );
  });

  it("falls back to accept-language for non-prefixed routes without session", async () => {
    const request = new NextRequest("http://localhost/settings/language", {
      headers: {
        "accept-language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/ru/settings/language",
    );
  });

  it("resolves to Spanish from a Spanish Accept-Language header", async () => {
    const request = new NextRequest("http://localhost/", {
      headers: {
        "accept-language": "es-MX,es;q=0.9,en;q=0.8",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/es");
  });

  it("falls back to English when no supported locale matches Accept-Language", async () => {
    const request = new NextRequest("http://localhost/", {
      headers: {
        "accept-language": "de-DE,de;q=0.9",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/en");
  });

  it.each(SETTINGS_ROUTE_CASES)(
    "redirects unauthenticated users from $url",
    async ({ url, locale }) => {
      const request = new NextRequest(url);

      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `http://localhost/${locale}/login`,
      );
    },
  );

  it.each(SETTINGS_ROUTE_CASES)(
    "allows authenticated access to $url",
    async ({ url }) => {
      getSessionMock.mockResolvedValue({ user: { id: "u1", locale: "en" } });

      const request = new NextRequest(url);
      const response = await proxy(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );
});
