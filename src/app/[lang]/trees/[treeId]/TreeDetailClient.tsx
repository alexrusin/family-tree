// src/app/[lang]/trees/[treeId]/TreeDetailClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Menu, X } from "lucide-react";
import AddMemberModal from "./AddMemberModal";
import AddRelationshipModal from "./AddRelationshipModal";
import EditMemberModal from "./EditMemberModal";
import ShareLinkSettingsModal from "./ShareLinkSettingsModal";
import TreeSidebar from "./TreeSidebar";
import MemberSidePanel, {
  type MemberSidePanelPresentation,
} from "./MemberSidePanel";
import RelationshipEdgePopover from "./RelationshipEdgePopover";
import { buildPublicUrl } from "./share-link-form-state";
import {
  pruneArrangement,
  type TreeMemberData,
  type TreeRelationship,
  type TreeFlowEdge,
  type TreeArrangement,
} from "@/lib/tree-domain/tree-layout";

const MEMBER_HARD_LIMIT = 300;
const TABLET_VIEWPORT_QUERY = "(min-width: 768px)";
const DESKTOP_VIEWPORT_QUERY = "(min-width: 1024px)";
const TreeCanvas = dynamic(() => import("./TreeCanvas"), { ssr: false });

function getMemberPanelPresentation(): MemberSidePanelPresentation {
  if (typeof window === "undefined") return "desktop";
  if (typeof window.matchMedia !== "function") return "desktop";
  if (window.matchMedia(DESKTOP_VIEWPORT_QUERY).matches) return "desktop";
  if (window.matchMedia(TABLET_VIEWPORT_QUERY).matches) return "tablet";
  return "mobile";
}

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
  addPhoto: string;
  updatePhoto: string;
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
  searchMembers: string;
  noMembersFound: string;
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
  dragSaveFailed: string;
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
    resetLayout: string;
  };
  treeMenu: {
    trigger: string;
    close: string;
    dialogLabel: string;
  };
  collaboration: {
    sidebarLink: string;
  };
  publicShare: {
    sidebarAction: string;
    modalTitle: string;
    enable: string;
    description: string;
    copy: string;
    copySuccess: string;
    regenerate: string;
    regenerateConfirm: string;
  };
  member: MemberSubT;
  relationship: RelationshipSubT;
  errors: ErrorsSubT;
}

interface TreeDetailClientProps {
  lang: string;
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
  lang,
  treeId,
  treeName,
  canEdit,
  isOwner,
  initialMemberCount,
  t,
}: TreeDetailClientProps) {
  const [members, setMembers] = useState<TreeMemberData[]>([]);
  const [relationships, setRelationships] = useState<TreeRelationship[]>([]);
  const [arrangement, setArrangement] = useState<TreeArrangement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const [addMemberModalKey, setAddMemberModalKey] = useState(0);
  const [addRelationshipModalKey, setAddRelationshipModalKey] = useState(0);
  const [isTreeMenuOpen, setIsTreeMenuOpen] = useState(false);
  const [memberPanelPresentation, setMemberPanelPresentation] =
    useState<MemberSidePanelPresentation>(() => getMemberPanelPresentation());
  const isDesktopViewport = memberPanelPresentation === "desktop";

  const loadTreeData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [mRes, rRes, aRes] = await Promise.all([
        fetch(`/api/trees/${treeId}/members`, { cache: "no-store" }),
        fetch(`/api/trees/${treeId}/relationships`, { cache: "no-store" }),
        fetch(`/api/trees/${treeId}/arrangement`, { cache: "no-store" }),
      ]);
      if (!mRes.ok || !rRes.ok) throw new Error("load");
      const mData = (await mRes.json()) as { members?: TreeMemberData[] };
      const rData = (await rRes.json()) as {
        relationships?: TreeRelationship[];
      };
      setMembers(mData.members ?? []);
      setRelationships(rData.relationships ?? []);
      if (aRes.ok) {
        const aData = (await aRes.json()) as {
          arrangement?: TreeArrangement | null;
        };
        setArrangement(aData.arrangement ?? null);
      }
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

  const loadShareState = useCallback(async () => {
    if (!isOwner) return;

    const response = await fetch(`/api/trees/${treeId}/share-link`, {
      cache: "no-store",
    });
    if (!response.ok) return;

    const payload = (await response.json()) as {
      shareEnabled: boolean;
      shareToken: string;
      publicUrl?: string;
    };

    setShareEnabled(payload.shareEnabled);
    setPublicUrl(
      payload.publicUrl ??
        buildPublicUrl(window.location.origin, payload.shareToken),
    );
  }, [isOwner, treeId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadShareState();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadShareState]);

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
      if (nextPresentation === "desktop") {
        setIsTreeMenuOpen(false);
      }
    };

    desktopMediaQueryList.addEventListener("change", syncViewport);
    tabletMediaQueryList.addEventListener("change", syncViewport);

    return () => {
      desktopMediaQueryList.removeEventListener("change", syncViewport);
      tabletMediaQueryList.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (isDesktopViewport || !isTreeMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTreeMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDesktopViewport, isTreeMenuOpen]);

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
  const closeTreeMenu = useCallback(() => {
    setIsTreeMenuOpen(false);
  }, []);
  const openAddMemberFromTreeMenu = useCallback(() => {
    closeTreeMenu();
    openAddMemberModal();
  }, [closeTreeMenu, openAddMemberModal]);
  const openAddRelationshipFromTreeMenu = useCallback(() => {
    closeTreeMenu();
    openAddRelationshipModal();
  }, [closeTreeMenu, openAddRelationshipModal]);
  const openShareSettingsFromTreeMenu = useCallback(() => {
    closeTreeMenu();
    setIsShareModalOpen(true);
  }, [closeTreeMenu]);
  const handleCollaboratorsNavigate = useCallback(() => {
    closeTreeMenu();
  }, [closeTreeMenu]);
  const collaboratorsHref = `/${lang}/trees/${treeId}/collaborators`;

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

  const handleMemberCreated = useCallback((member: TreeMemberData) => {
    setMembers((prev) => [...prev, member]);
    setLoadError(null);
  }, []);

  const handleRelationshipCreated = useCallback(
    (relationship: TreeRelationship) => {
      setRelationships((prev) => [...prev, relationship]);
      setLoadError(null);
    },
    [],
  );

  const handleRelationshipRemoved = useCallback((relationshipId: string) => {
    setActiveEdgePopover(null);
    setRelationships((prev) => prev.filter((item) => item.id !== relationshipId));
    setLoadError(null);
  }, []);

  const handleMemberDeleted = useCallback(
    (memberId: string) => {
      const nextMembers = members.filter((member) => member.id !== memberId);

      setSelectedMemberId((current) => (current === memberId ? null : current));
      setEditingMember((current) => (current?.id === memberId ? null : current));
      setMembers(nextMembers);
      setRelationships((prev) =>
        prev.filter(
          (relationship) =>
            relationship.fromMemberId !== memberId &&
            relationship.toMemberId !== memberId,
        ),
      );
      setArrangement((current) =>
        current === null
          ? null
          : pruneArrangement(current, new Set(nextMembers.map((member) => member.id))),
      );
      setLoadError(null);
    },
    [members],
  );

  const handleNodeDragStop = useCallback(
    async (memberId: string, position: { x: number; y: number }) => {
      const prevArrangement = arrangement;
      const nextArrangement = {
        ...(arrangement ?? {}),
        [memberId]: position,
      } as TreeArrangement;
      try {
        const response = await fetch(`/api/trees/${treeId}/arrangement`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ arrangement: nextArrangement }),
        });
        if (!response.ok) throw new Error("save failed");
        setArrangement(nextArrangement);
        setLayoutError(null);
      } catch {
        // Revert visual positions by setting a new arrangement reference with the
        // same data — this triggers the useEffect in TreeCanvas to re-sync nodes.
        setArrangement(
          prevArrangement === null
            ? ({} as TreeArrangement)
            : { ...prevArrangement },
        );
        setLayoutError(t.errors.dragSaveFailed);
      }
    },
    [arrangement, treeId, t.errors.dragSaveFailed],
  );

  const handleResetLayout = useCallback(async () => {
    try {
      const response = await fetch(`/api/trees/${treeId}/arrangement`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("reset failed");
      setArrangement(null);
      setLayoutError(null);
    } catch {
      setLayoutError(t.errors.resetLayoutFailed);
    }
  }, [treeId, t.errors.resetLayoutFailed]);

  const handleResetLayoutFromTreeMenu = useCallback(() => {
    closeTreeMenu();
    void handleResetLayout();
  }, [closeTreeMenu, handleResetLayout]);

  const treeSidebarTranslations = {
    collaborators: t.collaboration.sidebarLink,
    shareLink: t.publicShare.sidebarAction,
    addMember: t.addMember,
    addRelationship: t.addRelationship,
    viewOnly: t.viewOnly,
    warningBanner: t.sidebar.warningBanner,
    limitReached: t.sidebar.limitReached,
    memberCount: t.sidebar.memberCount,
    resetLayout: t.sidebar.resetLayout,
  };

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Tree Menu shell */}
      {isDesktopViewport ? (
        <TreeSidebar
          treeName={treeName}
          memberCount={memberCount}
          collaboratorsHref={collaboratorsHref}
          canEdit={canEdit}
          canManageShare={isOwner}
          canAddMember={canAddMember}
          onCollaboratorsNavigate={handleCollaboratorsNavigate}
          onAddMember={openAddMemberFromTreeMenu}
          onAddRelationship={openAddRelationshipFromTreeMenu}
          onOpenShareSettings={openShareSettingsFromTreeMenu}
          onResetLayout={handleResetLayout}
          t={treeSidebarTranslations}
        />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsTreeMenuOpen(true)}
            className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm"
          >
            <Menu
              className="h-4 w-4"
              aria-hidden="true"
              data-testid="tree-menu-trigger-icon"
            />
            {t.treeMenu.trigger}
          </button>

          {isTreeMenuOpen && (
            <div
              className="absolute inset-0 z-30"
              role="dialog"
              aria-modal="true"
              aria-label={t.treeMenu.dialogLabel}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/30"
                onClick={closeTreeMenu}
                aria-label={t.treeMenu.close}
                data-testid="tree-menu-backdrop"
              />

              <div
                className="absolute inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white shadow-xl"
                data-testid="tree-menu-drawer"
              >
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                  <p className="text-sm font-semibold text-stone-900">
                    {t.treeMenu.trigger}
                  </p>
                  <button
                    type="button"
                    onClick={closeTreeMenu}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-stone-700 hover:bg-stone-100"
                    aria-label={t.treeMenu.close}
                    data-testid="tree-menu-close-control"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {t.treeMenu.close}
                  </button>
                </div>

                <div className="min-h-0 flex-1">
                  <TreeSidebar
                    treeName={treeName}
                    memberCount={memberCount}
                    collaboratorsHref={collaboratorsHref}
                    canEdit={canEdit}
                    canManageShare={isOwner}
                    canAddMember={canAddMember}
                    onCollaboratorsNavigate={handleCollaboratorsNavigate}
                    onAddMember={openAddMemberFromTreeMenu}
                    onAddRelationship={openAddRelationshipFromTreeMenu}
                    onOpenShareSettings={openShareSettingsFromTreeMenu}
                    onResetLayout={handleResetLayoutFromTreeMenu}
                    className="w-full border-r-0 shadow-none"
                    t={treeSidebarTranslations}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Canvas area */}
      <div className="flex-1 relative">
        {loadError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        )}
        {layoutError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{layoutError}</p>
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
            canEdit={canEdit}
            arrangement={arrangement}
            onNodeClick={(id) => {
              setActiveEdgePopover(null);
              if (!isDesktopViewport) {
                setIsTreeMenuOpen(false);
              }
              setSelectedMemberId(id);
            }}
            onEdgeClick={handleEdgeClick}
            onAddMember={openAddMemberModal}
            onDragStop={canEdit ? handleNodeDragStop : undefined}
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
          onRelationshipRemoved={handleRelationshipRemoved}
          presentation={memberPanelPresentation}
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

      <ShareLinkSettingsModal
        isOpen={isShareModalOpen}
        shareEnabled={shareEnabled}
        publicUrl={publicUrl}
        onClose={() => setIsShareModalOpen(false)}
        onToggle={async (enabled) => {
          const response = await fetch(`/api/trees/${treeId}/share-link`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "setEnabled", enabled }),
          });

          if (response.ok) {
            setShareEnabled(enabled);
          }
        }}
        onRegenerate={async () => {
          const response = await fetch(`/api/trees/${treeId}/share-link`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "regenerate" }),
          });
          if (!response.ok) return;

          const payload = (await response.json()) as { shareToken?: string };
          const nextToken = payload.shareToken ?? "";
          if (!nextToken) return;

          setPublicUrl(buildPublicUrl(window.location.origin, nextToken));
        }}
        t={{
          title: t.publicShare.modalTitle,
          enable: t.publicShare.enable,
          description: t.publicShare.description,
          copy: t.publicShare.copy,
          copySuccess: t.publicShare.copySuccess,
          regenerate: t.publicShare.regenerate,
          regenerateConfirm: t.publicShare.regenerateConfirm,
          close: t.panel.close,
        }}
      />

      {/* Add member modal */}
      <AddMemberModal
        key={`add-member-${addMemberModalKey}`}
        isOpen={isAddMemberOpen}
        treeId={treeId}
        onClose={() => setIsAddMemberOpen(false)}
        onMemberCreated={handleMemberCreated}
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
        onRelationshipCreated={handleRelationshipCreated}
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
