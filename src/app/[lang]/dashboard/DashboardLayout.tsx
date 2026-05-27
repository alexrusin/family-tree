"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import CreateTreeButton from "./CreateTreeButton";
import DashboardClient from "./DashboardClient";
import {
  DASHBOARD_WELCOME_CREATE_TREE,
  DASHBOARD_WELCOME_PARAM,
  EMAIL_VERIFIED_PARAM,
} from "@/lib/auth-callback";

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
    emailVerifiedTitle: string;
    emailVerifiedBody: string;
    createFirstTreePrompt: string;
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
  const searchParams = useSearchParams();
  const emailVerified = searchParams.get(EMAIL_VERIFIED_PARAM) === "1";
  const shouldInviteFirstTree =
    emailVerified &&
    searchParams.get(DASHBOARD_WELCOME_PARAM) ===
      DASHBOARD_WELCOME_CREATE_TREE &&
    myTrees.length === 0;
  const [createModalOpen, setCreateModalOpen] = useState(() =>
    shouldInviteFirstTree,
  );

  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {emailVerified ? (
          <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-950 shadow-sm">
            <h2 className="text-lg font-semibold">{t.emailVerifiedTitle}</h2>
            <p className="mt-2 text-sm text-emerald-900">
              {t.emailVerifiedBody}
            </p>
            {shouldInviteFirstTree ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-emerald-900">
                  {t.createFirstTreePrompt}
                </p>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  {t.createTree}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

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
