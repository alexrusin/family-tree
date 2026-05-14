// src/app/[lang]/trees/[treeId]/RelationshipEdgePopover.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface RelationshipEdgePopoverProps {
  position: { x: number; y: number };
  fromName: string;
  toName: string;
  typeLabel: string;
  relationshipId: string;
  treeId: string;
  onRemoved: () => void;
  onClose: () => void;
  t: {
    close: string;
    remove: string;
    removing: string;
    removeFailed: string;
  };
}

export default function RelationshipEdgePopover({
  position,
  fromName,
  toName,
  typeLabel,
  relationshipId,
  treeId,
  onRemoved,
  onClose,
  t,
}: RelationshipEdgePopoverProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleRemove = async () => {
    setError(null);
    setIsRemoving(true);
    try {
      const res = await fetch(
        `/api/trees/${treeId}/relationships/${relationshipId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("failed");
      onRemoved();
    } catch {
      setError(t.removeFailed);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-white border border-stone-200 rounded-xl shadow-xl p-4 w-64"
      style={{ top: position.y - 8, left: position.x - 8 }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-stone-700">
          <span className="font-semibold">{fromName}</span>{" "}
          <span className="text-stone-500">{typeLabel}</span>{" "}
          <span className="font-semibold">{toName}</span>
        </p>
        <button
          onClick={onClose}
          className="ml-2 p-0.5 text-stone-400 hover:text-stone-600 rounded"
          aria-label={t.close}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <button
        onClick={handleRemove}
        disabled={isRemoving}
        className="w-full px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
      >
        {isRemoving ? (
          <>
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t.removing}
          </>
        ) : (
          t.remove
        )}
      </button>
    </div>
  );
}
