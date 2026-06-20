"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteTreeConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onTreeDeleted: () => void;
  treeId: string | null;
  treeName: string | null;
}

export default function DeleteTreeConfirmation({
  isOpen,
  onClose,
  onTreeDeleted,
  treeId,
  treeName,
}: DeleteTreeConfirmationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!treeId) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.errorCode || "Failed to delete tree");
      }

      onClose();
      onTreeDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-red-900">Delete Tree</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-red-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-stone-700">
            Are you sure you want to delete <strong>{treeName}</strong>?
          </p>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-semibold mb-1">
              This action cannot be undone.
            </p>
            <p className="text-sm text-red-600">
              The tree and all associated members, relationships, and
              collaborator access will be permanently deleted.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Tree"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
