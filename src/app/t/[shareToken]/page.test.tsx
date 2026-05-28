import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("./PublicTreeViewClient", () => ({
  default: ({ t }: { t: { canvas: { emptyTitle: string } } }) => (
    <div data-testid="tree-view">{t.canvas.emptyTitle}</div>
  ),
}));

vi.mock("./PublicLinkDisabled", () => ({
  default: ({ t }: { t: { title: string } }) => (
    <div data-testid="link-disabled">{t.title}</div>
  ),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { default: PublicTreePage } = await import("./page");

const basePayload = {
  tree: { id: "tree-1", name: "Test Tree" },
  members: [],
  relationships: [],
};

function makeOkResponse(ownerLocale: string) {
  return {
    status: 200,
    ok: true,
    json: async () => ({ ...basePayload, ownerLocale }),
  };
}

describe("PublicTreePage owner locale propagation", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("renders Spanish dictionary copy when owner locale is es", async () => {
    fetchMock.mockResolvedValue(makeOkResponse("es"));

    const markup = renderToStaticMarkup(
      await PublicTreePage({
        params: Promise.resolve({ shareToken: "token-es" }),
      }),
    );

    expect(markup).toContain("Aún no hay miembros");
  });

  it("renders Russian dictionary copy when owner locale is ru", async () => {
    fetchMock.mockResolvedValue(makeOkResponse("ru"));

    const markup = renderToStaticMarkup(
      await PublicTreePage({
        params: Promise.resolve({ shareToken: "token-ru" }),
      }),
    );

    expect(markup).toContain("Участников пока нет");
  });

  it("renders English dictionary copy when owner locale is en", async () => {
    fetchMock.mockResolvedValue(makeOkResponse("en"));

    const markup = renderToStaticMarkup(
      await PublicTreePage({
        params: Promise.resolve({ shareToken: "token-en" }),
      }),
    );

    expect(markup).toContain("No members yet");
  });

  it("falls back to English for an unsupported owner locale", async () => {
    fetchMock.mockResolvedValue(makeOkResponse("de"));

    const markup = renderToStaticMarkup(
      await PublicTreePage({
        params: Promise.resolve({ shareToken: "token-de" }),
      }),
    );

    expect(markup).toContain("No members yet");
  });
});
