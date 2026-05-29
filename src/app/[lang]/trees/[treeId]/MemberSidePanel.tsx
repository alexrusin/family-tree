// src/app/[lang]/trees/[treeId]/MemberSidePanel.tsx
"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import {
  type TreeMemberData,
  type TreeRelationship,
  formatMemberDateRange,
} from "@/lib/tree-domain/tree-layout";

export type MemberSidePanelPresentation = "desktop" | "tablet" | "mobile";

interface SidePanelT {
  close: string;
  born: string;
  died: string;
  gender: string;
  about: string;
  relationships: string;
  noRelationships: string;
  parentOf: string;
  childOf: string;
  spouseOf: string;
  siblingOf: string;
  editMember: string;
  deleteMember: string;
  deleteConfirmBody: string;
  deleteConfirm: string;
  deleteCancel: string;
  deleting: string;
  deleteFailed: string;
  remove: string;
  removing: string;
  removeFailed: string;
  genderMale: string;
  genderFemale: string;
  genderOther: string;
  genderUndisclosed: string;
}

interface MemberSidePanelProps {
  member: TreeMemberData;
  allRelationships: TreeRelationship[];
  getMemberName: (id: string) => string;
  canEdit: boolean;
  isOwner: boolean;
  treeId: string;
  onClose: () => void;
  onEditClick: () => void;
  onDeleted: () => void;
  onRelationshipRemoved: () => void;
  presentation?: MemberSidePanelPresentation;
  t: SidePanelT;
}

export default function MemberSidePanel({
  member,
  allRelationships,
  getMemberName,
  canEdit,
  isOwner,
  treeId,
  onClose,
  onEditClick,
  onDeleted,
  onRelationshipRemoved,
  presentation = "desktop",
  t,
}: MemberSidePanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removingRelId, setRemovingRelId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const displayName = `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`;
  const dateRange = formatMemberDateRange(member);
  const genderLabels: Record<string, string> = {
    male: t.genderMale,
    female: t.genderFemale,
    other: t.genderOther,
    undisclosed: t.genderUndisclosed,
  };

  const memberRels = allRelationships.filter(
    (r) => r.fromMemberId === member.id || r.toMemberId === member.id,
  );

  function getRelLabel(r: TreeRelationship): {
    label: string;
    otherName: string;
  } {
    if (r.type === "parent") {
      if (r.fromMemberId === member.id)
        return { label: t.parentOf, otherName: getMemberName(r.toMemberId) };
      return { label: t.childOf, otherName: getMemberName(r.fromMemberId) };
    }
    if (r.type === "spouse") {
      const otherId =
        r.fromMemberId === member.id ? r.toMemberId : r.fromMemberId;
      return { label: t.spouseOf, otherName: getMemberName(otherId) };
    }
    const otherId =
      r.fromMemberId === member.id ? r.toMemberId : r.fromMemberId;
    return { label: t.siblingOf, otherName: getMemberName(otherId) };
  }

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/trees/${treeId}/members/${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      onDeleted();
    } catch {
      setDeleteError(t.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveRel = async (relId: string) => {
    setRemoveError(null);
    setRemovingRelId(relId);
    try {
      const res = await fetch(`/api/trees/${treeId}/relationships/${relId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      onRelationshipRemoved();
    } catch {
      setRemoveError(t.removeFailed);
    } finally {
      setRemovingRelId(null);
    }
  };

  const showCloseLabel = presentation !== "desktop";
  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <h2 className="text-base font-semibold text-stone-900 truncate">
          {displayName}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-lg p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100"
          aria-label={t.close}
        >
          <X className="w-5 h-5" />
          {showCloseLabel && (
            <span className="text-sm font-medium text-stone-700">{t.close}</span>
          )}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Photo */}
        <div className="flex justify-center">
          {member.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={member.photoUrl}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 text-2xl font-bold border-4 border-white shadow-lg">
              {`${member.firstName.charAt(0)}${member.lastName?.charAt(0) ?? ""}`.toUpperCase()}
            </div>
          )}
        </div>

        {/* Dates */}
        {dateRange && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
              {member.deathYear ? `${t.born} / ${t.died}` : t.born}
            </p>
            <p className="text-sm text-stone-700">{dateRange}</p>
          </div>
        )}

        {/* Gender */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
            {t.gender}
          </p>
          <p className="text-sm text-stone-700">
            {genderLabels[member.gender] ?? t.genderUndisclosed}
          </p>
        </div>

        {/* Bio */}
        {member.bio && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
              {t.about}
            </p>
            <p className="text-sm text-stone-600 leading-relaxed">
              {member.bio}
            </p>
          </div>
        )}

        {/* Relationships */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
            {t.relationships}
          </p>
          {removeError && (
            <p className="text-xs text-red-600 mb-2">{removeError}</p>
          )}
          {memberRels.length === 0 ? (
            <p className="text-sm text-stone-500">{t.noRelationships}</p>
          ) : (
            <ul className="space-y-2">
              {memberRels.map((r) => {
                const { label, otherName } = getRelLabel(r);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-stone-700 min-w-0">
                      <span className="text-stone-400">{label}</span>{" "}
                      <span className="font-medium">{otherName}</span>
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveRel(r.id)}
                        disabled={removingRelId === r.id}
                        className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {removingRelId === r.id ? t.removing : t.remove}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Delete confirmation inline */}
        {showDeleteConfirm && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 mb-3">{t.deleteConfirmBody}</p>
            {deleteError && (
              <p className="text-xs text-red-600 mb-2">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-3 py-1.5 bg-stone-100 text-stone-800 text-sm rounded-lg font-semibold"
              >
                {t.deleteCancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-1"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t.deleting}
                  </>
                ) : (
                  t.deleteConfirm
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t border-stone-100 space-y-2">
        {canEdit && (
          <button
            onClick={onEditClick}
            className="w-full px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors text-sm"
          >
            {t.editMember}
          </button>
        )}
        {isOwner && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg font-semibold hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {t.deleteMember}
          </button>
        )}
      </div>
    </>
  );

  if (presentation === "tablet") {
    return (
      <div className="absolute inset-0 z-40" role="dialog" aria-modal="true">
        <button
          type="button"
          className="absolute inset-0 bg-black/30"
          onClick={onClose}
          aria-label={t.close}
          data-testid="member-panel-backdrop"
        />
        <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-hidden border-l border-stone-200 bg-white shadow-xl">
          {panelContent}
        </div>
      </div>
    );
  }

  if (presentation === "mobile") {
    return (
      <div
        className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-white"
        role="dialog"
        aria-modal="true"
      >
        {panelContent}
      </div>
    );
  }

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-80 flex-col overflow-hidden border-l border-stone-200 bg-white shadow-xl">
      {panelContent}
    </div>
  );
}
