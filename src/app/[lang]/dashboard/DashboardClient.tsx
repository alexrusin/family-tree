"use client";

import { useState, useRef, useEffect } from "react";
import { Users, MoreVertical, TreePine } from "lucide-react";
import { useRouter } from "next/navigation";
import CreateTreeModal from "./CreateTreeModal";
import RenameTreeModal from "./RenameTreeModal";
import DeleteTreeConfirmation from "./DeleteTreeConfirmation";

type CollaboratorRole = "editor" | "viewer";

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
  role?: CollaboratorRole;
}

interface DashboardClientProps {
  t: {
    createTree: string;
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
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
}

function TreeCard({
  tree,
  t,
  onOpenTree,
  onRenameClick,
  onDeleteClick,
}: {
  tree: Tree;
  t: DashboardClientProps["t"];
  onOpenTree: (treeId: string) => void;
  onRenameClick: (treeId: string, treeName: string) => void;
  onDeleteClick: (treeId: string, treeName: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Generate initials from owner name
  const initials = tree.ownerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenTree(tree.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenTree(tree.id);
        }
      }}
      className="group bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 relative flex flex-col h-full cursor-pointer"
      aria-label={`Open ${tree.name}`}
    >
      {/* ⋮ menu — only show for owned trees */}
      {tree.isOwned && (
        <div
          className="absolute top-4 right-4"
          ref={menuRef}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="p-1 text-stone-400 hover:text-amber-900 transition-colors rounded-lg hover:bg-stone-100"
            aria-label="Card options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-stone-100 py-1 z-10">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onRenameClick(tree.id, tree.name);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
              >
                {t.cardMenuRename}
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteClick(tree.id, tree.name);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                {t.cardMenuDelete}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card body */}
      <div className="mb-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-900 mb-4 group-hover:scale-110 transition-transform">
          <TreePine className="w-8 h-8" />
        </div>
        <h3 className="text-[22px] font-medium leading-snug text-stone-900 mb-2">
          {tree.name}
        </h3>
        <div className="flex items-center gap-1.5 text-stone-500 text-sm">
          <Users className="w-4 h-4" />
          <span>
            {tree.memberCount} {t.members}
          </span>
        </div>
      </div>

      {/* Card footer */}
      <div className="mt-auto pt-5 border-t border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Owner avatar */}
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 font-semibold text-xs flex-shrink-0">
            {tree.ownerImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={tree.ownerImage}
                alt={tree.ownerName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
              {t.owner}
            </span>
            <span className="text-sm font-medium text-stone-700 truncate">
              {tree.ownerName}
            </span>
          </div>
        </div>

        {/* Role badge or last edit */}
        <div className="text-right">
          {tree.role ? (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">
                {tree.role === "editor" ? "Editor" : "Viewer"}
              </span>
              <span className="text-xs text-stone-500">{tree.lastEdit}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
                {t.lastEdit}
              </span>
              <span className="text-sm text-stone-600">{tree.lastEdit}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  t,
}: {
  t: Pick<DashboardClientProps["t"], "emptyTitle" | "emptyBody">;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-900 mb-6">
        <TreePine className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-semibold text-stone-700 mb-2">
        {t.emptyTitle}
      </h3>
      <p className="text-stone-500 text-base max-w-xs">{t.emptyBody}</p>
    </div>
  );
}

export default function DashboardClient({
  t,
  myTrees,
  sharedTrees,
  lang,
  createModalOpen,
  setCreateModalOpen,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"mine" | "shared">("mine");
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [selectedTreeName, setSelectedTreeName] = useState<string | null>(null);

  const activeTrees = activeTab === "mine" ? myTrees : sharedTrees;

  const handleRenameClick = (treeId: string, treeName: string) => {
    setSelectedTreeId(treeId);
    setSelectedTreeName(treeName);
    setRenameModalOpen(true);
  };

  const handleDeleteClick = (treeId: string, treeName: string) => {
    setSelectedTreeId(treeId);
    setSelectedTreeName(treeName);
    setDeleteModalOpen(true);
  };

  const handleTreeCreated = () => {
    router.refresh();
  };

  const handleTreeRenamed = () => {
    router.refresh();
  };

  const handleTreeDeleted = () => {
    router.refresh();
  };

  const handleOpenTree = (treeId: string) => {
    router.push(`/${lang}/trees/${treeId}`);
  };

  return (
    <>
      {/* Modals */}
      <CreateTreeModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTreeCreated={handleTreeCreated}
      />
      <RenameTreeModal
        isOpen={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setSelectedTreeId(null);
          setSelectedTreeName(null);
        }}
        onTreeRenamed={handleTreeRenamed}
        treeId={selectedTreeId}
        currentName={selectedTreeName}
      />
      <DeleteTreeConfirmation
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedTreeId(null);
          setSelectedTreeName(null);
        }}
        onTreeDeleted={handleTreeDeleted}
        treeId={selectedTreeId}
        treeName={selectedTreeName}
      />

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-8 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === "mine"
                ? "bg-amber-900 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-200/50"
            }`}
          >
            {t.myTrees}
          </button>
          <button
            onClick={() => setActiveTab("shared")}
            className={`px-8 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === "shared"
                ? "bg-amber-900 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-200/50"
            }`}
          >
            {t.sharedWithMe}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTrees.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          activeTrees.map((tree) => (
            <TreeCard
              key={tree.id}
              tree={tree}
              t={t}
              onOpenTree={handleOpenTree}
              onRenameClick={handleRenameClick}
              onDeleteClick={handleDeleteClick}
            />
          ))
        )}
      </div>
    </>
  );
}
