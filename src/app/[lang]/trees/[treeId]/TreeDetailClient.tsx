// src/app/[lang]/trees/[treeId]/TreeDetailClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import AddMemberModal from "./AddMemberModal";
import AddRelationshipModal from "./AddRelationshipModal";
import EditMemberModal from "./EditMemberModal";
import TreeSidebar from "./TreeSidebar";
import MemberSidePanel from "./MemberSidePanel";
import RelationshipEdgePopover from "./RelationshipEdgePopover";
import {
  type TreeMemberData,
  type TreeRelationship,
  type TreeFlowEdge,
} from "@/lib/tree-domain/tree-layout";

const MEMBER_HARD_LIMIT = 300;
const TreeCanvas = dynamic(() => import("./TreeCanvas"), { ssr: false });

// ── Localisation shape ────────────────────────────────────────────────────
interface MemberSubT {
  addTitle: string;
  addSubtitle: string;
  editTitle: string;
  editSubtitle: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  gender: string;
  genderUndisclosed: string;
  genderMale: string;
  genderFemale: string;
  genderOther: string;
  bio: string;
  bioPlaceholder: string;
  birthSection: string;
  deathSection: string;
  precision: string;
  precisionYear: string;
  precisionMonth: string;
  precisionDay: string;
  yearLabel: string;
  monthLabel: string;
  dayLabel: string;
  profilePhoto: string;
  isLiving: string;
  update: string;
  closeModal: string;
  currentPhotoAlt: string;
  photoEditingSoon: string;
}
interface RelationshipSubT {
  addTitle: string;
  addSubtitle: string;
  memberA: string;
  memberB: string;
  type: string;
  selectMember: string;
  parent: string;
  child: string;
  spouse: string;
  sibling: string;
  needTwoMembers: string;
  closeModal: string;
  remove: string;
  removing: string;
  removeFailed: string;
}
interface ErrorsSubT {
  ERR_FIRST_NAME_REQUIRED: string;
  ERR_MEMBER_LIMIT_REACHED: string;
  ERR_IMAGE_TOO_LARGE: string;
  ERR_UNSUPPORTED_IMAGE_TYPE: string;
  ERR_DUPLICATE_RELATIONSHIP: string;
  ERR_SELF_RELATIONSHIP: string;
  ERR_FORBIDDEN: string;
  ERR_INVALID_RELATIONSHIP: string;
  ERR_DEATH_BEFORE_BIRTH: string;
  ERR_INVALID_PARTIAL_DATE: string;
  memberGeneric: string;
  relationshipGeneric: string;
  loadFailed: string;
  chooseTwoMembers: string;
  chooseDifferentMembers: string;
  [key: string]: string;
}
interface TreeT {
  addMember: string;
  addRelationship: string;
  viewOnly: string;
  cancel: string;
  saving: string;
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
    removeFailed: string;
    genderMale: string;
    genderFemale: string;
    genderOther: string;
    genderUndisclosed: string;
  };
  sidebar: {
    warningBanner: string;
    limitReached: string;
    memberCount: string;
  };
  member: MemberSubT;
  relationship: RelationshipSubT;
  errors: ErrorsSubT;
}

interface TreeDetailClientProps {
  treeId: string;
  treeName: string;
  canEdit: boolean;
  isOwner: boolean;
  initialMemberCount: number;
  t: TreeT;
}

// ── Edge → label helper ────────────────────────────────────────────────────
function edgeLabel(
  edge: TreeFlowEdge,
  getMemberName: (id: string) => string,
  t: { parentOf: string; spouseOf: string },
): { fromName: string; toName: string; typeLabel: string } | null {
  const data = edge.data as {
    relationshipId?: string;
    relationshipIds?: string[];
  };
  const relationshipId = data.relationshipId ?? data.relationshipIds?.[0];
  if (!relationshipId) return null;

  if (edge.target.startsWith("union-")) {
    const sortedKey = edge.target.replace("union-", "");
    const [a, b] = sortedKey.split("::");
    const otherId = edge.source === a ? b : a;
    return {
      fromName: getMemberName(edge.source),
      toName: getMemberName(otherId),
      typeLabel: t.spouseOf,
    };
  }

  if (edge.type === "parent") {
    return {
      fromName: getMemberName(edge.source),
      toName: getMemberName(edge.target),
      typeLabel: t.parentOf,
    };
  }

  if (edge.type === "spouse") {
    return {
      fromName: getMemberName(edge.source),
      toName: getMemberName(edge.target),
      typeLabel: t.spouseOf,
    };
  }

  return null;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TreeDetailClient({
  treeId,
  treeName,
  canEdit,
  isOwner,
  initialMemberCount,
  t,
}: TreeDetailClientProps) {
  const [members, setMembers] = useState<TreeMemberData[]>([]);
  const [relationships, setRelationships] = useState<TreeRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TreeMemberData | null>(
    null,
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeEdgePopover, setActiveEdgePopover] = useState<{
    edge: TreeFlowEdge;
    position: { x: number; y: number };
    label: { fromName: string; toName: string; typeLabel: string };
  } | null>(null);
  const [addMemberModalKey, setAddMemberModalKey] = useState(0);
  const [addRelationshipModalKey, setAddRelationshipModalKey] = useState(0);

  const loadTreeData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [mRes, rRes] = await Promise.all([
        fetch(`/api/trees/${treeId}/members`, { cache: "no-store" }),
        fetch(`/api/trees/${treeId}/relationships`, { cache: "no-store" }),
      ]);
      if (!mRes.ok || !rRes.ok) throw new Error("load");
      const mData = (await mRes.json()) as { members?: TreeMemberData[] };
      const rData = (await rRes.json()) as {
        relationships?: TreeRelationship[];
      };
      setMembers(mData.members ?? []);
      setRelationships(rData.relationships ?? []);
    } catch {
      setLoadError(t.errors.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, [treeId, t.errors.loadFailed]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadTreeData();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadTreeData]);

  const memberCount = isLoading ? initialMemberCount : members.length;
  const canAddMember = canEdit && memberCount < MEMBER_HARD_LIMIT;

  const openAddMemberModal = useCallback(() => {
    if (!canAddMember) return;
    setAddMemberModalKey((prev) => prev + 1);
    setIsAddMemberOpen(true);
  }, [canAddMember]);

  const openAddRelationshipModal = useCallback(() => {
    if (!canEdit) return;
    setAddRelationshipModalKey((prev) => prev + 1);
    setIsAddRelationshipOpen(true);
  }, [canEdit]);

  const getMemberName = useCallback(
    (id: string) => {
      const m = members.find((x) => x.id === id);
      return m ? `${m.firstName}${m.lastName ? ` ${m.lastName}` : ""}` : id;
    },
    [members],
  );

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: TreeFlowEdge) => {
      if (!canEdit) return;
      const label = edgeLabel(edge, getMemberName, {
        parentOf: t.panel.parentOf,
        spouseOf: t.panel.spouseOf,
      });
      if (!label) return;
      setSelectedMemberId(null);
      setActiveEdgePopover({
        edge,
        position: { x: event.clientX, y: event.clientY },
        label,
      });
    },
    [canEdit, getMemberName, t.panel.parentOf, t.panel.spouseOf],
  );

  const handleRelationshipRemoved = useCallback(() => {
    setActiveEdgePopover(null);
    void loadTreeData();
  }, [loadTreeData]);

  const handleMemberDeleted = useCallback(() => {
    setSelectedMemberId(null);
    void loadTreeData();
  }, [loadTreeData]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <TreeSidebar
        treeName={treeName}
        memberCount={memberCount}
        canEdit={canEdit}
        canAddMember={canAddMember}
        onAddMember={openAddMemberModal}
        onAddRelationship={openAddRelationshipModal}
        t={{
          addMember: t.addMember,
          addRelationship: t.addRelationship,
          viewOnly: t.viewOnly,
          warningBanner: t.sidebar.warningBanner,
          limitReached: t.sidebar.limitReached,
          memberCount: t.sidebar.memberCount,
        }}
      />

      {/* Canvas area */}
      <div className="flex-1 relative">
        {loadError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        )}
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-[#fbf9f8]">
            <p className="text-stone-500">{t.canvas.loading}</p>
          </div>
        ) : (
          <TreeCanvas
            members={members}
            relationships={relationships}
            canAddMember={canAddMember}
            onNodeClick={(id) => {
              setActiveEdgePopover(null);
              setSelectedMemberId(id);
            }}
            onEdgeClick={handleEdgeClick}
            onAddMember={openAddMemberModal}
            t={t.canvas}
          />
        )}
      </div>

      {/* Right side panel */}
      {selectedMember && (
        <MemberSidePanel
          member={selectedMember}
          allRelationships={relationships}
          getMemberName={getMemberName}
          canEdit={canEdit}
          isOwner={isOwner}
          treeId={treeId}
          onClose={() => setSelectedMemberId(null)}
          onEditClick={() => setEditingMember(selectedMember)}
          onDeleted={handleMemberDeleted}
          onRelationshipRemoved={() => void loadTreeData()}
          t={{
            ...t.panel,
            remove: t.relationship.remove,
            removing: t.relationship.removing,
          }}
        />
      )}

      {/* Edge removal popover */}
      {activeEdgePopover && (
        <RelationshipEdgePopover
          position={activeEdgePopover.position}
          fromName={activeEdgePopover.label.fromName}
          toName={activeEdgePopover.label.toName}
          typeLabel={activeEdgePopover.label.typeLabel}
          relationshipId={
            (
              activeEdgePopover.edge.data as {
                relationshipId?: string;
                relationshipIds?: string[];
              }
            ).relationshipId ??
            (
              activeEdgePopover.edge.data as {
                relationshipId?: string;
                relationshipIds?: string[];
              }
            ).relationshipIds?.[0] ??
            ""
          }
          treeId={treeId}
          onRemoved={handleRelationshipRemoved}
          onClose={() => setActiveEdgePopover(null)}
          t={{
            close: t.panel.close,
            remove: t.relationship.remove,
            removing: t.relationship.removing,
            removeFailed: t.relationship.removeFailed,
          }}
        />
      )}

      {/* Add member modal */}
      <AddMemberModal
        key={`add-member-${addMemberModalKey}`}
        isOpen={isAddMemberOpen}
        treeId={treeId}
        onClose={() => setIsAddMemberOpen(false)}
        onMemberCreated={loadTreeData}
        t={{
          ...t.member,
          cancel: t.cancel,
          saving: t.saving,
          add: t.addMember,
          errors: t.errors,
        }}
      />

      {/* Add relationship modal */}
      <AddRelationshipModal
        key={`add-relationship-${addRelationshipModalKey}`}
        isOpen={isAddRelationshipOpen}
        treeId={treeId}
        members={members}
        onClose={() => setIsAddRelationshipOpen(false)}
        onRelationshipCreated={loadTreeData}
        t={{
          ...t.relationship,
          cancel: t.cancel,
          saving: t.saving,
          add: t.addRelationship,
          errors: t.errors,
        }}
      />

      {/* Edit member modal */}
      {editingMember && (
        <EditMemberModal
          key={editingMember.id}
          isOpen={true}
          treeId={treeId}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onMemberUpdated={loadTreeData}
          t={{
            ...t.member,
            cancel: t.cancel,
            saving: t.saving,
            errors: t.errors,
          }}
        />
      )}
    </div>
  );
}
