import { notFound, redirect } from "next/navigation";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCurrentUser } from "@/lib/auth-utils";
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

  const isOwner = tree.ownerId === user.id;

  return (
    <>
      <Header
        lang={lang}
        langPickerErrors={t.settings.language.errors}
        navFamilyTree={t.dashboard.navFamilyTree}
        navGallery={t.dashboard.navGallery}
        navSettings={t.dashboard.navSettings}
        logoutLabel={t.dashboard.logout}
      />

      {/* Full-screen canvas below the fixed header (header height ≈ 3.5rem / 56px) */}
      <div className="fixed inset-0 top-14 overflow-hidden">
        <TreeDetailClient
          lang={lang}
          treeId={tree.id}
          treeName={tree.name}
          canEdit={canEdit}
          isOwner={isOwner}
          initialMemberCount={tree.memberCount}
          t={{ ...t.tree, familyPictureSidebarLink: t.familyPicture.sidebarLink }}
        />
      </div>
    </>
  );
}
