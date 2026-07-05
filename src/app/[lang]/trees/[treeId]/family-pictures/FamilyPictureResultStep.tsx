"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, Download, Sparkles, Zap } from "lucide-react";
import type { GenerationStatusValue } from "./FamilyPictureClient";
import FamilyPictureVersionGallery, {
  type FamilyPictureVersionGalleryT,
  type FamilyPictureVersionSummary,
} from "./FamilyPictureVersionGallery";

interface FamilyPictureResultStepT {
  aiGenerated: string;
  privateNote: string;
  download: string;
  startAnother: string;
  savedTo: string;
  failedTitle: string;
  failedBody: string;
  refine: {
    label: string;
    subtitle: string;
    placeholder: string;
    button: string;
    refining: string;
    note: string;
    failedNote: string;
  };
}

/** The image route and its watermarked-download counterpart differ only in
 * this one path segment; both carry the same `?v=` Version selector. */
function toDownloadUrl(imageUrl: string): string {
  return imageUrl.replace("/image?", "/download?");
}

interface FamilyPictureResultStepProps {
  t: FamilyPictureResultStepT;
  imageUrl: string | null;
  status: GenerationStatusValue;
  onStartAnother: () => void;
  onTweak: (instruction: string) => void;
  tweaking: boolean;
  tweakError: string | null;
  tweakFailed: boolean;
  versionsT: FamilyPictureVersionGalleryT;
  versions: FamilyPictureVersionSummary[] | null;
  onRevert: (versionNumber: number) => void;
  reverting: boolean;
}

export default function FamilyPictureResultStep({
  t,
  imageUrl,
  status,
  onStartAnother,
  onTweak,
  tweaking,
  tweakError,
  tweakFailed,
  versionsT,
  versions,
  onRevert,
  reverting,
}: FamilyPictureResultStepProps) {
  const [instruction, setInstruction] = useState("");
  // A failed tweak keeps the last successful Version on screen — only the
  // absence of any Version at all (the initial generation failing) shows the
  // full failure state.
  if (!imageUrl) {
    return (
      <section>
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-red-950 text-sm">
                {t.failedTitle}
              </h2>
              <p className="text-red-900/80 text-sm mt-1">{t.failedBody}</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            type="button"
            onClick={onStartAnother}
            className="text-stone-500 hover:text-amber-900 px-4 py-3 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.startAnother}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 sm:p-5">
            <div className="relative rounded-xl overflow-hidden bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Generated family portrait"
                className="w-full block"
              />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg">
                <Sparkles className="w-3.5 h-3.5" />
                {t.aiGenerated}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-4 px-1">
              <p className="text-xs text-stone-400">{t.privateNote}</p>
              <a
                href={toDownloadUrl(imageUrl)}
                download
                title={t.download}
                aria-label={t.download}
                className="text-stone-500 hover:text-amber-900 p-2 rounded-lg hover:bg-stone-50 transition-colors shrink-0"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mt-5">
            <label htmlFor="tweak-input" className="text-sm font-semibold text-stone-900">
              {t.refine.label}
            </label>
            <p className="text-stone-500 text-xs mt-1 mb-3">{t.refine.subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="tweak-input"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={t.refine.placeholder}
                disabled={tweaking || status === "pending"}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800/40 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={
                  tweaking || status === "pending" || instruction.trim().length === 0
                }
                onClick={() => {
                  onTweak(instruction.trim());
                  setInstruction("");
                }}
                className="bg-amber-900 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Zap className="w-4 h-4" />
                {tweaking || status === "pending" ? t.refine.refining : t.refine.button}
              </button>
            </div>
            {tweakError && (
              <p className="text-sm text-red-600 mt-2">{tweakError}</p>
            )}
            {tweakFailed && !tweakError && (
              <p className="text-sm text-red-600 mt-2">{t.refine.failedNote}</p>
            )}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-400">
              <Zap className="w-3.5 h-3.5 text-amber-700" />
              {t.refine.note}
            </div>
          </div>
        </div>

        <FamilyPictureVersionGallery
          t={versionsT}
          versions={versions}
          onRevert={onRevert}
          reverting={reverting}
        />
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          type="button"
          onClick={onStartAnother}
          className="text-stone-500 hover:text-amber-900 px-4 py-3 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.startAnother}
        </button>
        <div className="text-sm text-stone-400">{t.savedTo}</div>
      </div>
    </section>
  );
}
