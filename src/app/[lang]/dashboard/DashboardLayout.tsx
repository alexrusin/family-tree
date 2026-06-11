"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import CreateTreeButton from "./CreateTreeButton";
import DashboardClient from "./DashboardClient";
import ImportTreeModal from "./ImportTreeModal";
import ImportReportModal from "./ImportReportModal";
import { EMAIL_VERIFIED_PARAM } from "@/lib/auth-callback";
import type { ImportReport } from "@/lib/gedcom/import-mapper";

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
    cardMenuRename: string;
    cardMenuDelete: string;
    importTree: string;
    importModal: {
      title: string;
      description: string;
      fileLabel: string;
      fileHint: string;
      cancel: string;
      submit: string;
      submitting: string;
      errorNoFile: string;
      errorGeneric: string;
    };
    importReport: {
      title: string;
      description: string;
      peopleImported: string;
      close: string;
    };
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailVerified = searchParams.get(EMAIL_VERIFIED_PARAM) === "1";
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importedTreeId, setImportedTreeId] = useState<string | null>(null);

  const handleGoToImportedTree = () => {
    if (importedTreeId) {
      router.push(`/${lang}/trees/${importedTreeId}`);
    }
    setImportReport(null);
    setImportedTreeId(null);
  };

  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {emailVerified ? (
          <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-950 shadow-sm">
            <h2 className="text-lg font-semibold">{t.emailVerifiedTitle}</h2>
            <p className="mt-2 text-sm text-emerald-900">
              {t.emailVerifiedBody}
            </p>
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
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => setImportModalOpen(true)}
              className="bg-white text-amber-900 border border-amber-900/20 px-6 py-3 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm font-semibold tracking-wide">
                {t.importTree}
              </span>
            </button>
            <CreateTreeButton
              label={t.createTree}
              onClick={() => setCreateModalOpen(true)}
            />
          </div>
        </div>

        <ImportTreeModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImported={({ treeId, report }) => {
            setImportedTreeId(treeId);
            setImportReport(report);
          }}
          t={t.importModal}
        />
        <ImportReportModal
          report={importReport}
          onClose={handleGoToImportedTree}
          t={t.importReport}
        />

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
