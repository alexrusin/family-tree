import { notFound, redirect } from "next/navigation";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDictionary, hasLocale } from "../dictionaries/dictionaries";
import Header from "../components/Header";
import DashboardLayout from "./DashboardLayout";
import { getCurrentUser } from "@/lib/auth-utils";
import { formatRelativeTime } from "@/lib/tree-utils";

export default async function DashboardPage({
  params,
}: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  // Get current user from session
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${lang}/login`);
  }

  const t = await getDictionary(lang);

  // Initialize Prisma client
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  // Fetch user's owned trees
  const ownedTrees = await prisma.familyTree.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch trees shared with the user (collaborator access)
  const sharedCollaborations = await prisma.collaborator.findMany({
    where: { userId: user.id },
    include: { tree: true },
    orderBy: { acceptedAt: "desc" },
  });

  // Format owned trees for display
  const myTrees = ownedTrees.map((tree) => ({
    id: tree.id,
    name: tree.name,
    memberCount: tree.memberCount,
    ownerName: user.name || user.email,
    ownerImage: user.image,
    lastEdit: formatRelativeTime(tree.updatedAt),
    isOwned: true,
    shareEnabled: tree.shareEnabled,
    shareToken: tree.shareToken,
  }));

  // Format shared trees for display
  const sharedTrees = sharedCollaborations
    .filter((collab) => collab.acceptedAt !== null) // Only show accepted invitations
    .map((collab) => ({
      id: collab.tree.id,
      name: collab.tree.name,
      memberCount: collab.tree.memberCount,
      ownerName: "", // Will fetch owner separately if needed
      ownerImage: "",
      lastEdit: formatRelativeTime(collab.tree.updatedAt),
      isOwned: false,
      role: collab.role,
      shareEnabled: collab.tree.shareEnabled,
      shareToken: collab.tree.shareToken,
    }));

  return (
    <>
      <Header
        lang={lang}
        langToggleLabel={t.nav.langToggle}
        navFamilyTree={t.dashboard.navFamilyTree}
        navGallery={t.dashboard.navGallery}
        logoutLabel={t.dashboard.logout}
      />
      <main>
        <DashboardLayout
          t={{
            createTree: t.dashboard.createTree,
            title: t.dashboard.title,
            subtitle: t.dashboard.subtitle,
            myTrees: t.dashboard.myTrees,
            sharedWithMe: t.dashboard.sharedWithMe,
            members: t.dashboard.members,
            owner: t.dashboard.owner,
            lastEdit: t.dashboard.lastEdit,
            emptyTitle: t.dashboard.emptyTitle,
            emptyBody: t.dashboard.emptyBody,
            cardMenuRename: t.dashboard.cardMenuRename,
            cardMenuDelete: t.dashboard.cardMenuDelete,
          }}
          myTrees={myTrees}
          sharedTrees={sharedTrees}
          lang={lang}
        />
      </main>
    </>
  );
}
