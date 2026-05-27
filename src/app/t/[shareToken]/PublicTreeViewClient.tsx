"use client";

import { useEffect, useMemo, useState } from "react";
import TreeCanvas from "@/app/[lang]/trees/[treeId]/TreeCanvas";
import MemberSidePanel, {
  type MemberSidePanelPresentation,
} from "@/app/[lang]/trees/[treeId]/MemberSidePanel";
import type {
  TreeMemberData,
  TreeRelationship,
} from "@/lib/tree-domain/tree-layout";

const TABLET_VIEWPORT_QUERY = "(min-width: 768px)";
const DESKTOP_VIEWPORT_QUERY = "(min-width: 1024px)";

function getMemberPanelPresentation(): MemberSidePanelPresentation {
  if (typeof window === "undefined") return "desktop";
  if (typeof window.matchMedia !== "function") return "desktop";
  if (window.matchMedia(DESKTOP_VIEWPORT_QUERY).matches) return "desktop";
  if (window.matchMedia(TABLET_VIEWPORT_QUERY).matches) return "tablet";
  return "mobile";
}

export default function PublicTreeViewClient({
  treeId,
  members,
  relationships,
  treeName,
  t,
}: {
  treeId: string;
  members: TreeMemberData[];
  relationships: TreeRelationship[];
  treeName: string;
  t: {
    canvas: {
      emptyTitle: string;
      emptyBody: string;
      addFirstMember: string;
      fitToScreen: string;
      zoomIn: string;
      zoomOut: string;
      addMember: string;
      loading: string;
    };
    panel: {
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
    };
  };
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberPanelPresentation, setMemberPanelPresentation] =
    useState<MemberSidePanelPresentation>(() => getMemberPanelPresentation());

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const desktopMediaQueryList = window.matchMedia(DESKTOP_VIEWPORT_QUERY);
    const tabletMediaQueryList = window.matchMedia(TABLET_VIEWPORT_QUERY);

    const syncViewport = () => {
      const nextPresentation = desktopMediaQueryList.matches
        ? "desktop"
        : tabletMediaQueryList.matches
          ? "tablet"
          : "mobile";
      setMemberPanelPresentation(nextPresentation);
    };

    desktopMediaQueryList.addEventListener("change", syncViewport);
    tabletMediaQueryList.addEventListener("change", syncViewport);

    return () => {
      desktopMediaQueryList.removeEventListener("change", syncViewport);
      tabletMediaQueryList.removeEventListener("change", syncViewport);
    };
  }, []);

  const getMemberName = (id: string) => {
    const member = members.find((entry) => entry.id === id);
    return member
      ? `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`
      : id;
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#fbf9f8]">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 border border-stone-200 rounded-full px-4 py-2 text-sm font-semibold text-amber-900">
        {treeName}
      </div>

      <div className="h-full">
        <TreeCanvas
          members={members}
          relationships={relationships}
          canAddMember={false}
          onNodeClick={setSelectedMemberId}
          onEdgeClick={() => {}}
          onAddMember={() => {}}
          t={t.canvas}
        />
      </div>

      {selectedMember && (
        <MemberSidePanel
          member={selectedMember}
          allRelationships={relationships}
          getMemberName={getMemberName}
          canEdit={false}
          isOwner={false}
          treeId={treeId}
          onClose={() => setSelectedMemberId(null)}
          onEditClick={() => {}}
          onDeleted={() => {}}
          onRelationshipRemoved={() => {}}
          presentation={memberPanelPresentation}
          t={t.panel}
        />
      )}
    </div>
  );
}
