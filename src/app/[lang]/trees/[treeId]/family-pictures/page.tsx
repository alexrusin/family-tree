import { notFound, redirect } from "next/navigation";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth-utils";
import Header from "../../../components/Header";
import { getDictionary, hasLocale } from "../../../dictionaries/dictionaries";
import FamilyPictureClient from "./FamilyPictureClient";

export const dynamic = "force-dynamic";

export default async function FamilyPicturesPage({
  params,
}: {
  params: Promise<{ lang: string; treeId: string }>;
}) {
  const { lang, treeId } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    const callbackPath = `/${lang}/trees/${encodeURIComponent(treeId)}/family-pictures`;
    redirect(`/${lang}/login?callback=${encodeURIComponent(callbackPath)}`);
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
    },
  });

  if (!tree) {
    notFound();
  }

  let hasAccess = tree.ownerId === user.id;

  if (!hasAccess) {
    const collaborator = await prisma.collaborator.findUnique({
      where: {
        treeId_userId: {
          treeId,
          userId: user.id,
        },
      },
      select: {
        acceptedAt: true,
      },
    });

    hasAccess = Boolean(collaborator?.acceptedAt);
  }

  if (!hasAccess) {
    notFound();
  }

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

      <FamilyPictureClient
        lang={lang}
        treeId={tree.id}
        treeName={tree.name}
        t={t.familyPicture}
      />
    </>
  );
}
