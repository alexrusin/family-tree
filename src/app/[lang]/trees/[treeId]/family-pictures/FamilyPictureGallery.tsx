"use client";

import { AlertTriangle, ImageOff, Loader2, Sparkles, Trash2 } from "lucide-react";
import type { FamilyPictureSummary } from "./FamilyPictureClient";
import { familyPictureTitle } from "./family-picture-title";

interface FamilyPictureGalleryT {
  title: string;
  subtitle: string;
  generating: string;
  readyUpdated: string;
  failedRefunded: string;
  empty: string;
  delete: string;
}

interface FamilyPictureGalleryProps {
  t: FamilyPictureGalleryT;
  pictures: FamilyPictureSummary[] | null;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function FamilyPictureGallery({
  t,
  pictures,
  onView,
  onDelete,
}: FamilyPictureGalleryProps) {
  return (
    <section className="mt-14">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        {t.title}
      </h3>
      <p className="text-stone-500 text-sm mb-4 mt-1">{t.subtitle}</p>

      {pictures === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-2xl border border-stone-100 bg-stone-50 animate-pulse"
            />
          ))}
        </div>
      ) : pictures.length === 0 ? (
        <p className="text-sm text-stone-400 py-8 text-center">{t.empty}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pictures.map((picture) => (
            <div
              key={picture.id}
              className={[
                "relative bg-white rounded-2xl border shadow-sm overflow-hidden",
                picture.status === "pending"
                  ? "border-amber-200"
                  : "border-stone-100",
                picture.status === "succeeded"
                  ? "group cursor-pointer hover:shadow-lg transition-shadow"
                  : "",
              ].join(" ")}
              onClick={() => picture.status === "succeeded" && onView(picture.id)}
            >
              {picture.status !== "pending" && (
                <button
                  type="button"
                  title={t.delete}
                  aria-label={t.delete}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(picture.id);
                  }}
                  className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-lg bg-white/85 backdrop-blur text-stone-500 hover:text-red-600 hover:bg-white shadow-sm flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="relative aspect-[4/3] bg-stone-100">
                {picture.status === "pending" && (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                      {t.generating}
                    </span>
                  </div>
                )}
                {picture.status === "succeeded" && picture.imageUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={picture.imageUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded-md">
                      <Sparkles className="w-3 h-3" />
                      {t.readyUpdated}
                    </span>
                  </>
                )}
                {picture.status === "failed" && (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-8 h-8 text-stone-300" />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-3 h-3" />
                      {t.failedRefunded}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="text-sm font-semibold text-stone-800">
                  {familyPictureTitle(picture)}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {new Date(picture.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
