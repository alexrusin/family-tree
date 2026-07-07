"use client";

export interface FamilyPictureVersionSummary {
  versionNumber: number;
  createdAt: string;
  isCurrent: boolean;
  imageUrl: string;
}

export interface FamilyPictureVersionGalleryT {
  title: string;
  countLabel: string;
  current: string;
  revert: string;
  versionLabel: string;
  footerNote: string;
}

interface FamilyPictureVersionGalleryProps {
  t: FamilyPictureVersionGalleryT;
  versions: FamilyPictureVersionSummary[] | null;
  onRevert: (versionNumber: number) => void;
  reverting: boolean;
}

export default function FamilyPictureVersionGallery({
  t,
  versions,
  onRevert,
  reverting,
}: FamilyPictureVersionGalleryProps) {
  if (!versions || versions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 h-fit min-w-0 lg:sticky lg:top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          {t.title}
        </h3>
        <span className="text-xs text-stone-400">
          {t.countLabel.replace("{count}", String(versions.length))}
        </span>
      </div>
      <div className="space-y-2.5">
        {versions.map((version) => (
          <div
            key={version.versionNumber}
            className={[
              "flex items-center gap-3 rounded-xl border p-2.5 transition-all",
              version.isCurrent
                ? "border-amber-700 bg-amber-50/60"
                : "border-stone-100 hover:border-stone-200",
            ].join(" ")}
          >
            <div
              className={[
                "w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-100",
                version.isCurrent ? "ring-2 ring-amber-700" : "",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={version.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-stone-800">
                {t.versionLabel.replace("{n}", String(version.versionNumber))}
              </div>
            </div>
            {version.isCurrent ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 shrink-0">
                {t.current}
              </span>
            ) : (
              <button
                type="button"
                disabled={reverting}
                onClick={() => onRevert(version.versionNumber)}
                className="text-xs font-semibold text-amber-900 hover:underline shrink-0 disabled:opacity-40 disabled:pointer-events-none"
              >
                {t.revert}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-stone-400 mt-4 pt-4 border-t border-stone-100">
        {t.footerNote}
      </p>
    </div>
  );
}
