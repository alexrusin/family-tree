"use client";

import { useState } from "react";

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
    regenerate: string;
    regenerateConfirm: string;
    close: string;
  };
}) {
  const [busy, setBusy] = useState<"toggle" | "regenerate" | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200 shadow-xl">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-amber-900">{t.title}</h2>
          <button onClick={onClose} className="text-stone-500">
            {t.close}
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
              className="px-3 py-2 rounded-lg bg-amber-900 text-white text-sm"
              onClick={async () => {
                await navigator.clipboard.writeText(publicUrl);
              }}
            >
              {t.copy}
            </button>
          </div>

          <button
            className="text-red-700 text-sm font-semibold"
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
