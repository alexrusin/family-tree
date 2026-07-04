"use client";

import { AlertTriangle, ArrowLeft, Sparkles } from "lucide-react";
import type { GenerationStatusValue } from "./FamilyPictureClient";

interface FamilyPictureResultStepT {
  aiGenerated: string;
  privateNote: string;
  startAnother: string;
  savedTo: string;
  failedTitle: string;
  failedBody: string;
}

interface FamilyPictureResultStepProps {
  t: FamilyPictureResultStepT;
  imageUrl: string | null;
  status: GenerationStatusValue;
  onStartAnother: () => void;
}

export default function FamilyPictureResultStep({
  t,
  imageUrl,
  status,
  onStartAnother,
}: FamilyPictureResultStepProps) {
  if (status === "failed" || !imageUrl) {
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
      <div className="max-w-2xl mx-auto">
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
          <p className="text-xs text-stone-400 mt-4 px-1">{t.privateNote}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 max-w-2xl mx-auto">
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
