"use client";

import { AlertTriangle, X } from "lucide-react";

interface RemoveCollaboratorConfirmationProps {
  isOpen: boolean;
  isRemoving: boolean;
  collaboratorName: string;
  onClose: () => void;
  onConfirm: () => void;
  t: {
    title: string;
    body: string;
    warning: string;
    cancel: string;
    confirm: string;
    removing: string;
  };
}

export default function RemoveCollaboratorConfirmation({
  isOpen,
  isRemoving,
  collaboratorName,
  onClose,
  onConfirm,
  t,
}: RemoveCollaboratorConfirmationProps) {
  if (!isOpen) return null;

  const bodyParts = t.body.split("{name}");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-red-900">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isRemoving}
            className="p-1 text-red-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label={t.cancel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-stone-700">
            {bodyParts[0]}
            <strong>{collaboratorName}</strong>
            {bodyParts[1] ?? ""}
          </p>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{t.warning}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isRemoving}
              className="flex-1 px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t.cancel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isRemoving}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRemoving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.removing}
                </>
              ) : (
                t.confirm
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
