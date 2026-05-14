"use client";

import { useState } from "react";
import CreateTreeButton from "./CreateTreeButton";
import DashboardClient from "./DashboardClient";

interface Tree {
  id: string;
  name: string;
  memberCount: number;
  ownerName: string;
  ownerImage?: string | null;
  lastEdit: string;
  isOwned: boolean;
  shareEnabled?: boolean;
  shareToken?: string;
  role?: "editor" | "viewer";
}

interface DashboardLayoutProps {
  t: {
    createTree: string;
    title: string;
    subtitle: string;
    myTrees: string;
    sharedWithMe: string;
    members: string;
    owner: string;
    lastEdit: string;
    emptyTitle: string;
    emptyBody: string;
    cardMenuRename: string;
    cardMenuDelete: string;
  };
  myTrees: Tree[];
  sharedTrees: Tree[];
  lang: string;
}

export default function DashboardLayout({
  t,
  myTrees,
  sharedTrees,
  lang,
}: DashboardLayoutProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-[36px] font-semibold leading-tight tracking-tight text-amber-900 mb-2">
              {t.title}
            </h1>
            <p className="text-stone-600 text-base">{t.subtitle}</p>
          </div>
          <CreateTreeButton
            label={t.createTree}
            onClick={() => setCreateModalOpen(true)}
          />
        </div>

        {/* Dashboard with modal state passed down */}
        <DashboardClient
          t={{
            createTree: t.createTree,
            myTrees: t.myTrees,
            sharedWithMe: t.sharedWithMe,
            members: t.members,
            owner: t.owner,
            lastEdit: t.lastEdit,
            emptyTitle: t.emptyTitle,
            emptyBody: t.emptyBody,
            cardMenuRename: t.cardMenuRename,
            cardMenuDelete: t.cardMenuDelete,
          }}
          myTrees={myTrees}
          sharedTrees={sharedTrees}
          lang={lang}
          createModalOpen={createModalOpen}
          setCreateModalOpen={setCreateModalOpen}
        />
      </div>
    </div>
  );
}
