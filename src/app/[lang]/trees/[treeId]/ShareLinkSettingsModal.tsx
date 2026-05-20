"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function ShareLinkSettingsModal({
  isOpen,
  shareEnabled,
  publicUrl,
  onClose,
  onToggle,
  onRegenerate,
  t,
}: {
  isOpen: boolean;
  shareEnabled: boolean;
  publicUrl: string;
  onClose: () => void;
  onToggle: (enabled: boolean) => Promise<void>;
  onRegenerate: () => Promise<void>;
  t: {
    title: string;
    enable: string;
    description: string;
    copy: string;
    copySuccess: string;
    regenerate: string;
    regenerateConfirm: string;
    close: string;
  };
}) {
  const [busy, setBusy] = useState<"toggle" | "regenerate" | null>(null);
  const [copySuccessVisible, setCopySuccessVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200 shadow-xl">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-amber-900">{t.title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-100 cursor-pointer"
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm text-stone-700">{t.enable}</span>
            <input
              type="checkbox"
              checked={shareEnabled}
              onChange={async (event) => {
                setBusy("toggle");
                await onToggle(event.target.checked);
                setBusy(null);
              }}
              disabled={busy !== null}
            />
          </label>

          <p className="text-xs text-stone-500">{t.description}</p>

          <div className="flex gap-2">
            <input
              readOnly
              value={publicUrl}
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              className="px-3 py-2 rounded-lg bg-amber-900 text-white text-sm cursor-pointer"
              onClick={async () => {
                await navigator.clipboard.writeText(publicUrl);
                setCopySuccessVisible(true);
                setTimeout(() => {
                  setCopySuccessVisible(false);
                }, 2000);
              }}
            >
              {t.copy}
            </button>
          </div>

          {copySuccessVisible && (
            <p
              className="text-xs text-green-700"
              role="status"
              aria-live="polite"
            >
              {t.copySuccess}
            </p>
          )}

          <button
            className="text-red-700 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed"
            disabled={busy !== null}
            onClick={async () => {
              if (!window.confirm(t.regenerateConfirm)) return;
              setBusy("regenerate");
              await onRegenerate();
              setBusy(null);
            }}
          >
            {t.regenerate}
          </button>
        </div>
      </div>
    </div>
  );
}
