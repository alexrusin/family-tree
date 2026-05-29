"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface RenameTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTreeRenamed: () => void;
  treeId: string | null;
  currentName: string | null;
}

export default function RenameTreeModal({
  isOpen,
  onClose,
  onTreeRenamed,
  treeId,
  currentName,
}: RenameTreeModalProps) {
  const [treeName, setTreeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !currentName) return;

    const timerId = window.setTimeout(() => {
      setTreeName(currentName);
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [isOpen, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!treeId) return;

    if (!treeName.trim()) {
      setError("Tree name is required");
      return;
    }

    if (treeName === currentName) {
      onClose();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: treeName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rename tree");
      }

      onClose();
      onTreeRenamed();
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-xl font-semibold text-stone-900">Rename Tree</h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              Tree Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={treeName}
              onChange={(e) => setTreeName(e.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || treeName === currentName}
              className="flex-1 px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
