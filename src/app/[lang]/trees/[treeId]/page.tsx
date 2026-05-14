import { notFound, redirect } from "next/navigation";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCurrentUser } from "@/lib/auth-utils";
import { formatRelativeTime } from "@/lib/tree-utils";
import Header from "../../components/Header";
import { getDictionary, hasLocale } from "../../dictionaries/dictionaries";
import TreeDetailClient from "./TreeDetailClient";

export default async function TreeDetailPage({
  params,
}: PageProps<"/[lang]/trees/[treeId]">) {
  const { lang, treeId } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${lang}/login`);
  }

  const t = await getDictionary(lang);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      memberCount: true,
      updatedAt: true,
    },
  });

  if (!tree) {
    notFound();
  }

  let canView = tree.ownerId === user.id;
  let canEdit = tree.ownerId === user.id;

  if (!canView) {
    const collaborator = await prisma.collaborator.findUnique({
      where: {
        treeId_userId: {
          treeId,
          userId: user.id,
        },
      },
      select: {
        role: true,
        acceptedAt: true,
      },
    });

    if (collaborator?.acceptedAt) {
      canView = true;
      canEdit = collaborator.role === "editor";
    }
  }

  if (!canView) {
    notFound();
  }

  return (
    <>
      <Header
        lang={lang}
        langToggleLabel={t.nav.langToggle}
        navFamilyTree={t.dashboard.navFamilyTree}
        navGallery={t.dashboard.navGallery}
        logoutLabel={t.dashboard.logout}
      />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <TreeDetailClient
            treeId={tree.id}
            treeName={tree.name}
            canEdit={canEdit}
            initialMemberCount={tree.memberCount}
            lastEdit={formatRelativeTime(tree.updatedAt)}
            t={t.tree}
          />
        </div>
      </main>
    </>
  );
}
