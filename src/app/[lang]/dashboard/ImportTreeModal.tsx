"use client";

import { useState, useRef } from "react";
import { X, Upload } from "lucide-react";
import type { ImportReport } from "@/lib/gedcom/import-mapper";

interface ImportTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (result: { treeId: string; report: ImportReport }) => void;
  t: {
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
}

export default function ImportTreeModal({
  isOpen,
  onClose,
  onImported,
  t,
}: ImportTreeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t.errorNoFile);
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/trees/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t.errorGeneric);
      }

      const data = await response.json();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onClose();
      onImported({ treeId: data.treeId, report: data.report });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
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
          <h2 className="text-xl font-semibold text-stone-900">{t.title}</h2>
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
          <p className="text-sm text-stone-600">{t.description}</p>

          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.fileLabel}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ged"
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-stone-500">{t.fileHint}</p>
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
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.submitting}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {t.submit}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
