"use client";

import { Info, Loader2 } from "lucide-react";

interface FamilyPictureGenerateStepT {
  title: string;
  body: string;
  noTabNote: string;
}

export default function FamilyPictureGenerateStep({
  t,
}: {
  t: FamilyPictureGenerateStepT;
}) {
  return (
    <section>
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto">
        <div className="relative w-full aspect-[4/3] rounded-xl bg-stone-100 overflow-hidden mb-8 flex items-center justify-center">
          <Loader2 className="w-14 h-14 text-amber-800 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-stone-900">{t.title}</h2>
        <p className="text-stone-500 text-sm mt-2 mb-2">{t.body}</p>
        <p className="text-stone-400 text-xs inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          {t.noTabNote}
        </p>
      </div>
    </section>
  );
}
