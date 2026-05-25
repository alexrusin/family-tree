import { notFound, redirect } from "next/navigation";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth-utils";
import Header from "../../../components/Header";
import { getDictionary, hasLocale } from "../../../dictionaries/dictionaries";
import CollaboratorsClient from "./CollaboratorsClient";
import { resolveAvatarUrlForUser } from "@/lib/avatar-storage";

export const dynamic = "force-dynamic";

export default async function CollaboratorsPage({
  params,
}: PageProps<"/[lang]/trees/[treeId]/collaborators">) {
  const { lang, treeId } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    const callbackPath = `/${lang}/trees/${encodeURIComponent(treeId)}/collaborators`;
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

  let role: "owner" | "editor" | "viewer" | "none" =
    tree.ownerId === user.id ? "owner" : "none";

  if (role === "none") {
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
      role = collaborator.role;
    }
  }

  if (role === "none") {
    notFound();
  }

  const collaborators = await prisma.collaborator.findMany({
    where: {
      treeId,
      acceptedAt: {
        not: null,
      },
    },
    orderBy: {
      acceptedAt: "asc",
    },
    select: {
      id: true,
      treeId: true,
      userId: true,
      role: true,
      acceptedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  const invitations =
    role === "owner"
      ? await prisma.invitation.findMany({
          where: {
            treeId,
            status: "pending",
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            treeId: true,
            invitedEmail: true,
            role: true,
            message: true,
            expiresAt: true,
          },
        })
      : [];

  return (
    <>
      <Header
        lang={lang}
        langToggleLabel={t.nav.langToggle}
        langToggleErrors={t.settings.language.errors}
        navFamilyTree={t.dashboard.navFamilyTree}
        navGallery={t.dashboard.navGallery}
        navSettings={t.dashboard.navSettings}
        logoutLabel={t.dashboard.logout}
      />

      <CollaboratorsClient
        lang={lang}
        treeId={tree.id}
        treeName={tree.name}
        isOwner={role === "owner"}
        currentUser={{
          name: user.name,
          email: user.email,
          image: resolveAvatarUrlForUser(user.id, user.image),
        }}
        initialCollaborators={collaborators.map((collaborator) => ({
          ...collaborator,
          user: {
            ...collaborator.user,
            image: resolveAvatarUrlForUser(
              collaborator.user.id,
              collaborator.user.image,
            ),
          },
          acceptedAt: collaborator.acceptedAt?.toISOString() ?? null,
        }))}
        initialInvitations={invitations.map((invitation) => ({
          ...invitation,
          expiresAt: invitation.expiresAt.toISOString(),
        }))}
        t={t.tree.collaboration}
      />
    </>
  );
}
