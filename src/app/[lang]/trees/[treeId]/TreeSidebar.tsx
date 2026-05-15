// src/app/[lang]/trees/[treeId]/TreeSidebar.tsx
"use client";

import Link from "next/link";
import { Plus, Link2, AlertTriangle, Users } from "lucide-react";

const MEMBER_WARN_THRESHOLD = 250;
const MEMBER_HARD_LIMIT = 300;

interface TreeSidebarT {
  addMember: string;
  addRelationship: string;
  collaborators: string;
  viewOnly: string;
  warningBanner: string;
  limitReached: string;
  memberCount: string;
}

interface TreeSidebarProps {
  treeName: string;
  memberCount: number;
  collaboratorsHref: string;
  canEdit: boolean;
  canAddMember: boolean;
  onAddMember: () => void;
  onAddRelationship: () => void;
  t: TreeSidebarT;
}

export default function TreeSidebar({
  treeName,
  memberCount,
  collaboratorsHref,
  canEdit,
  canAddMember,
  onAddMember,
  onAddRelationship,
  t,
}: TreeSidebarProps) {
  const atLimit = memberCount >= MEMBER_HARD_LIMIT;
  const nearLimit = memberCount >= MEMBER_WARN_THRESHOLD && !atLimit;

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col h-full shadow-sm">
      <div className="p-5 border-b border-stone-100">
        <h2 className="text-lg font-semibold text-amber-900 truncate">
          {treeName}
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          {t.memberCount.replace("{count}", String(memberCount))}
        </p>
      </div>

      {nearLimit && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            {t.warningBanner.replace("{count}", String(memberCount))}
          </p>
        </div>
      )}
      {atLimit && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">{t.limitReached}</p>
        </div>
      )}

      <div className="p-4 space-y-2 mt-2">
        <Link
          href={collaboratorsHref}
          className="w-full px-4 py-2.5 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Users className="w-4 h-4" />
          {t.collaborators}
        </Link>

        {canEdit ? (
          <>
            <button
              onClick={onAddMember}
              disabled={!canAddMember}
              className="w-full px-4 py-2.5 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Plus className="w-4 h-4" />
              {t.addMember}
            </button>
            <button
              onClick={onAddRelationship}
              className="w-full px-4 py-2.5 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Link2 className="w-4 h-4" />
              {t.addRelationship}
            </button>
          </>
        ) : (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
            {t.viewOnly}
          </span>
        )}
      </div>
    </aside>
  );
}
