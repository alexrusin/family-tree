import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDictionary } from "@/app/[lang]/dictionaries/dictionaries";
import { isLocale, DEFAULT_LOCALE } from "@/lib/locale";
import type {
  TreeArrangement,
  TreeMemberData,
  TreeRelationship,
} from "@/lib/tree-domain/tree-layout";
import PublicTreeViewClient from "./PublicTreeViewClient";
import PublicLinkDisabled from "./PublicLinkDisabled";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: {
      index: false,
      follow: false,
    },
  };
}

async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function PublicTreePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;

  const response = await fetch(
    `${await getBaseUrl()}/api/public-tree/${encodeURIComponent(shareToken)}`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    notFound();
  }

  if (response.status === 410) {
    const t = await getDictionary("en");
    return (
      <PublicLinkDisabled
        t={{
          title: t.tree.publicShare?.disabledTitle ?? "Link disabled",
          body:
            t.tree.publicShare?.disabledBody ??
            "This public link is no longer active.",
          cta: t.tree.publicShare?.createOwn ?? "Create your own family tree",
        }}
      />
    );
  }

  if (!response.ok) {
    notFound();
  }

  const payload = (await response.json()) as {
    tree: { id: string; name: string };
    ownerLocale: string;
    members: TreeMemberData[];
    relationships: TreeRelationship[];
    arrangement?: TreeArrangement | null;
  };

  const ownerLocale = isLocale(payload.ownerLocale)
    ? payload.ownerLocale
    : DEFAULT_LOCALE;
  const t = await getDictionary(ownerLocale);

  return (
    <PublicTreeViewClient
      treeId={payload.tree.id}
      treeName={payload.tree.name}
      members={payload.members}
      relationships={payload.relationships}
      arrangement={payload.arrangement ?? null}
      t={{
        canvas: t.tree.canvas,
        panel: {
          ...t.tree.panel,
          remove: t.tree.relationship.remove,
          removing: t.tree.relationship.removing,
        },
      }}
    />
  );
}
