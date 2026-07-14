"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check, Sparkles, ImageOff, TriangleAlert, Download } from "lucide-react";
import {
  resolveMemberEligibility,
  FAMILY_PICTURE_MAX_MEMBERS,
  type IneligibleReason,
} from "@/lib/family-picture/eligibility";
import {
  STYLE_PRESETS,
  SETTING_PRESETS,
  FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH,
} from "@/lib/family-picture/preset-catalog";
import { MONTHLY_GENERATION_ALLOWANCE } from "@/lib/family-picture/allowance-period";
import type {
  SettingPresetId,
  StylePresetId,
} from "@/lib/family-picture/prompt-builder";
import FamilyPictureGenerateStep from "./FamilyPictureGenerateStep";
import FamilyPictureResultStep from "./FamilyPictureResultStep";
import FamilyPictureGallery from "./FamilyPictureGallery";
import type { FamilyPictureVersionSummary } from "./FamilyPictureVersionGallery";

const CUSTOM_SETTING = "custom" as const;
const GENERATION_POLL_INTERVAL_MS = 2500;
const GALLERY_POLL_INTERVAL_MS = 4000;
const PICKER_PAGE_SIZE = 20;

export interface FamilyPictureT {
  sidebarLink: string;
  pageTitle: string;
  pageSubtitle: string;
  steps: {
    choosePeople: string;
    sceneStyle: string;
    generate: string;
    result: string;
  };
  allowance: {
    remainingLabel: string;
    capReachedTitle: string;
    capReachedBody: string;
  };
  picker: {
    title: string;
    subtitle: string;
    maxNote: string;
    capNote: string;
    searchPlaceholder: string;
    emptyResult: string;
    legendEligible: string;
    legendIneligible: string;
    reasonNoPhoto: string;
    reasonLivingMinor: string;
    reasonAgeUnconfirmable: string;
    reasonOverMax: string;
    selected: string;
    continue: string;
    guestNote: string;
    showing: string;
    prevPage: string;
    nextPage: string;
  };
  presets: {
    styleTitle: string;
    styleSubtitle: string;
    settingTitle: string;
    settingSubtitle: string;
    somewhereSpecific: string;
    somewhereSpecificSub: string;
    customPlacePlaceholder: string;
    customPlaceHint: string;
    personalTouchTitle: string;
    personalTouchOptional: string;
    personalTouchSubtitle: string;
    personalTouchPlaceholder: string;
    back: string;
    generateButton: string;
  };
  progress: {
    title: string;
    body: string;
    noTabNote: string;
  };
  result: {
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
  };
  gallery: {
    title: string;
    subtitle: string;
    generating: string;
    readyUpdated: string;
    failedRefunded: string;
    empty: string;
  };
  versions: {
    title: string;
    countLabel: string;
    current: string;
    revert: string;
    versionLabel: string;
    footerNote: string;
  };
  errors: {
    ERR_MEMBERS_REQUIRED: string;
    ERR_INVALID_STYLE_PRESET: string;
    ERR_INVALID_SETTING: string;
    ERR_TEXT_TOO_LONG: string;
    ERR_MEMBER_NOT_FOUND: string;
    ERR_INELIGIBLE_MEMBERS: string;
    ERR_FEATURE_PAUSED: string;
    ERR_INSTRUCTION_REQUIRED: string;
    ERR_NO_VERSION_TO_TWEAK: string;
    ERR_NOT_FOUND: string;
    ERR_VERSION_REQUIRED: string;
    ERR_VERSION_NOT_FOUND: string;
    generic: string;
    [key: string]: string;
  };
}

interface FamilyPictureClientProps {
  lang: string;
  treeId: string;
  treeName: string;
  t: FamilyPictureT;
}

export interface ApiTreeMember {
  id: string;
  firstName: string;
  lastName: string | null;
  isLiving: boolean;
  birthYear: number | null;
  deathYear: number | null;
  photoKey: string | null;
  photoUrl: string | null;
}

export interface FamilyPictureMemberSnapshot {
  id: string;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
}

export type GenerationStatusValue = "pending" | "succeeded" | "failed";

export interface FamilyPictureSummary {
  id: string;
  memberSnapshot: FamilyPictureMemberSnapshot[];
  stylePreset: string;
  settingPreset: string | null;
  customPlace: string | null;
  createdAt: string;
  status: GenerationStatusValue;
  errorMessage: string | null;
  imageUrl: string | null;
}

function memberDisplayName(member: {
  firstName: string;
  lastName: string | null;
}): string {
  return member.lastName ? `${member.firstName} ${member.lastName}` : member.firstName;
}

function memberInitials(member: {
  firstName: string;
  lastName: string | null;
}): string {
  return `${member.firstName.charAt(0)}${member.lastName ? member.lastName.charAt(0) : ""}`.toUpperCase();
}

function reasonLabel(
  reason: IneligibleReason,
  t: FamilyPictureT["picker"],
): string {
  switch (reason) {
    case "no-photo":
      return t.reasonNoPhoto;
    case "living-minor":
      return t.reasonLivingMinor;
    case "age-unconfirmable":
      return t.reasonAgeUnconfirmable;
    case "over-max":
      return t.reasonOverMax;
  }
}

function toDownloadUrl(imageUrl: string): string {
  return imageUrl.replace("/image?", "/download?");
}

// Compact, windowed page list: first, last, current ±1, with "…" gaps.
function pageWindow(current: number, total: number): (number | "ellipsis")[] {
  const shown = new Set<number>();
  for (const n of [1, total, current, current - 1, current + 1]) {
    if (n >= 1 && n <= total) shown.add(n);
  }
  const sorted = [...shown].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("ellipsis");
    out.push(n);
    prev = n;
  }
  return out;
}

function formatAllowanceDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function mapErrorCode(
  errorCode: string | null | undefined,
  errors: FamilyPictureT["errors"],
): string {
  if (errorCode && errorCode in errors) {
    return errors[errorCode];
  }
  return errors.generic;
}

export default function FamilyPictureClient({
  treeId,
  treeName,
  t,
}: FamilyPictureClientProps) {
  const [step, setStep] = useState(0);

  const [members, setMembers] = useState<ApiTreeMember[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [capFlash, setCapFlash] = useState(false);

  const [stylePreset, setStylePreset] = useState<StylePresetId>(
    STYLE_PRESETS[0].id,
  );
  const [settingChoice, setSettingChoice] = useState<
    SettingPresetId | typeof CUSTOM_SETTING
  >(SETTING_PRESETS[0].id);
  const [customPlace, setCustomPlace] = useState("");
  const [personalTouch, setPersonalTouch] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<{
    familyPictureId: string;
    status: GenerationStatusValue;
    imageUrl: string | null;
    errorMessage: string | null;
  } | null>(null);

  const [gallery, setGallery] = useState<FamilyPictureSummary[] | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<{
    remaining: number;
    resetAt: string;
  } | null>(null);
  const [capReachedResetAt, setCapReachedResetAt] = useState<string | null>(null);

  const [tweaking, setTweaking] = useState(false);
  const [tweakError, setTweakError] = useState<string | null>(null);
  const [tweakFailed, setTweakFailed] = useState(false);
  const [tweakCapResetAt, setTweakCapResetAt] = useState<string | null>(null);

  const [versions, setVersions] = useState<FamilyPictureVersionSummary[] | null>(null);
  const [reverting, setReverting] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);
  // Distinguishes "this pending cycle is a tweak" from the initial
  // generation, so the poll effect knows a failure should keep the last
  // successful Version on screen instead of showing the full failure state.
  const tweakInFlightRef = useRef(false);

  const capTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMembers = useCallback(async () => {
    setMembersError(null);
    try {
      const response = await fetch(`/api/trees/${treeId}/members`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("load-failed");
      const data = (await response.json()) as { members?: ApiTreeMember[] };
      setMembers(data.members ?? []);
    } catch {
      setMembersError(t.errors.generic);
      setMembers([]);
    }
  }, [treeId, t.errors.generic]);

  const loadGallery = useCallback(async () => {
    try {
      const response = await fetch(`/api/trees/${treeId}/family-pictures`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        familyPictures?: FamilyPictureSummary[];
        remainingGenerations?: number;
        allowanceResetAt?: string;
      };
      setGallery(data.familyPictures ?? []);
      if (
        typeof data.remainingGenerations === "number" &&
        typeof data.allowanceResetAt === "string"
      ) {
        setAllowance({
          remaining: data.remainingGenerations,
          resetAt: data.allowanceResetAt,
        });
      }
    } catch {
      // Gallery load failures are non-fatal — the creator flow still works.
    }
  }, [treeId]);

  const loadVersions = useCallback(
    async (familyPictureId: string) => {
      try {
        const response = await fetch(
          `/api/trees/${treeId}/family-pictures/${familyPictureId}/versions`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          versions?: FamilyPictureVersionSummary[];
        };
        setVersions(data.versions ?? null);
      } catch {
        // Non-fatal — the result still shows without the version gallery.
      }
    },
    [treeId],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadMembers();
      void loadGallery();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadMembers, loadGallery]);

  // Poll the gallery while anything in it is still pending, so returning to
  // this page after closing the tab surfaces a finished (or failed) picture
  // without a manual refresh.
  useEffect(() => {
    const hasPending = gallery?.some((p) => p.status === "pending") ?? false;
    if (!hasPending) return;
    const timerId = setInterval(() => {
      void loadGallery();
    }, GALLERY_POLL_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, [gallery, loadGallery]);

  // Poll the in-flight generation started from this session's creator flow.
  useEffect(() => {
    if (!generation || generation.status !== "pending") return;
    const timerId = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/trees/${treeId}/family-pictures/${generation.familyPictureId}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          status: GenerationStatusValue;
          imageUrl: string | null;
          errorMessage: string | null;
        };
        setGeneration((prev) =>
          prev ? { ...prev, ...data } : prev,
        );
        if (data.status !== "pending") {
          if (tweakInFlightRef.current) {
            tweakInFlightRef.current = false;
            setTweakFailed(data.status === "failed");
          }
          setStep(3);
          void loadGallery();
          if (data.status === "succeeded") {
            void loadVersions(generation.familyPictureId);
          }
        }
      } catch {
        // Keep polling — a transient network error shouldn't stop it.
      }
    }, GENERATION_POLL_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, [generation, treeId, loadGallery, loadVersions]);

  const eligibility = useMemo(() => {
    const map = new Map<string, { eligible: boolean; reason?: IneligibleReason }>();
    if (!members) return map;
    const today = new Date();
    for (const member of members) {
      const decision = resolveMemberEligibility(
        {
          isLiving: member.isLiving,
          birthYear: member.birthYear,
          hasProfilePhoto: !!member.photoKey,
        },
        today,
      );
      map.set(
        member.id,
        decision.eligible
          ? { eligible: true }
          : { eligible: false, reason: decision.reason },
      );
    }
    return map;
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      memberDisplayName(m).toLowerCase().includes(q),
    );
  }, [members, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / PICKER_PAGE_SIZE),
  );

  // Clamp during render so a shrinking list (search/reload) never strands the
  // view on an out-of-range page — no setState-in-effect needed.
  const safePage = Math.min(page, totalPages);

  const pagedMembers = useMemo(
    () =>
      filteredMembers.slice(
        (safePage - 1) * PICKER_PAGE_SIZE,
        safePage * PICKER_PAGE_SIZE,
      ),
    [filteredMembers, safePage],
  );

  const flashCap = useCallback(() => {
    setCapFlash(true);
    if (capTimerRef.current) clearTimeout(capTimerRef.current);
    capTimerRef.current = setTimeout(() => setCapFlash(false), 3200);
  }, []);

  const toggleMember = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((x) => x !== id);
        }
        if (prev.length >= FAMILY_PICTURE_MAX_MEMBERS) {
          flashCap();
          return prev;
        }
        return [...prev, id];
      });
    },
    [flashCap],
  );

  const selectedMembers = useMemo(
    () =>
      selectedIds
        .map((id) => members?.find((m) => m.id === id))
        .filter((m): m is ApiTreeMember => !!m),
    [selectedIds, members],
  );

  const resetCreator = useCallback(() => {
    setStep(0);
    setSelectedIds([]);
    setStylePreset(STYLE_PRESETS[0].id);
    setSettingChoice(SETTING_PRESETS[0].id);
    setCustomPlace("");
    setPersonalTouch("");
    setSubmitError(null);
    setCapReachedResetAt(null);
    setGeneration(null);
    setTweakError(null);
    setTweakFailed(false);
    setTweakCapResetAt(null);
    setVersions(null);
    tweakInFlightRef.current = false;
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setCapReachedResetAt(null);
    try {
      const body: Record<string, unknown> = {
        memberIds: selectedIds,
        stylePreset,
        personalTouch: personalTouch.trim() || undefined,
      };
      if (settingChoice === CUSTOM_SETTING) {
        body.customPlace = customPlace.trim();
      } else {
        body.settingPreset = settingChoice;
      }

      const response = await fetch(`/api/trees/${treeId}/family-pictures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as {
        familyPictureId?: string;
        generationId?: string;
        errorCode?: string;
        resetAt?: string;
      } | null;

      if (!response.ok || !payload?.familyPictureId) {
        if (payload?.errorCode === "ERR_ALLOWANCE_EXHAUSTED" && payload.resetAt) {
          setCapReachedResetAt(payload.resetAt);
        } else {
          setSubmitError(mapErrorCode(payload?.errorCode, t.errors));
        }
        setSubmitting(false);
        return;
      }

      setGeneration({
        familyPictureId: payload.familyPictureId,
        status: "pending",
        imageUrl: null,
        errorMessage: null,
      });
      setStep(2);
      void loadGallery();
    } catch {
      setSubmitError(t.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedIds,
    stylePreset,
    settingChoice,
    customPlace,
    personalTouch,
    treeId,
    t.errors,
    loadGallery,
  ]);

  const handleTweak = useCallback(
    async (instruction: string) => {
      if (!generation) return;
      setTweaking(true);
      setTweakError(null);
      setTweakCapResetAt(null);
      try {
        const response = await fetch(
          `/api/trees/${treeId}/family-pictures/${generation.familyPictureId}/tweak`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instruction }),
          },
        );
        const payload = (await response.json().catch(() => null)) as {
          generationId?: string;
          errorCode?: string;
          resetAt?: string;
        } | null;

        if (!response.ok || !payload?.generationId) {
          if (payload?.errorCode === "ERR_ALLOWANCE_EXHAUSTED" && payload.resetAt) {
            setTweakCapResetAt(payload.resetAt);
          } else {
            setTweakError(mapErrorCode(payload?.errorCode, t.errors));
          }
          return;
        }

        tweakInFlightRef.current = true;
        setTweakFailed(false);
        setGeneration((prev) =>
          prev ? { ...prev, status: "pending", errorMessage: null } : prev,
        );
      } catch {
        setTweakError(t.errors.generic);
      } finally {
        setTweaking(false);
      }
    },
    [generation, treeId, t.errors],
  );

  const handleRevert = useCallback(
    async (versionNumber: number) => {
      if (!generation) return;
      setReverting(true);
      setRevertError(null);
      try {
        const response = await fetch(
          `/api/trees/${treeId}/family-pictures/${generation.familyPictureId}/revert`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versionNumber }),
          },
        );
        const payload = (await response.json().catch(() => null)) as {
          errorCode?: string;
        } | null;

        if (!response.ok) {
          setRevertError(mapErrorCode(payload?.errorCode, t.errors));
          return;
        }

        setGeneration((prev) =>
          prev
            ? {
                ...prev,
                imageUrl: `/api/trees/${treeId}/family-pictures/${generation.familyPictureId}/image?v=${versionNumber}`,
              }
            : prev,
        );
        setVersions((prev) =>
          prev
            ? prev.map((v) => ({ ...v, isCurrent: v.versionNumber === versionNumber }))
            : prev,
        );
        void loadGallery();
      } catch {
        setRevertError(t.errors.generic);
      } finally {
        setReverting(false);
      }
    },
    [generation, treeId, loadGallery, t.errors],
  );

  const viewingPicture = gallery?.find((p) => p.id === viewingId) ?? null;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 pt-24 pb-24">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-3">
            <Sparkles className="w-4 h-4 text-amber-800" />
            <span>{treeName}</span>
            <span className="text-stone-300">/</span>
            <span className="text-stone-700 font-medium">{t.pageTitle}</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-amber-900">
            {t.pageTitle}
          </h1>
          <p className="text-stone-600 mt-1.5 text-[15px]">{t.pageSubtitle}</p>
        </div>
        {allowance && (
          <div className="shrink-0 bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-stone-800">
              {t.allowance.remainingLabel
                .replace("{remaining}", String(allowance.remaining))
                .replace("{cap}", String(MONTHLY_GENERATION_ALLOWANCE))
                .replace("{date}", formatAllowanceDate(allowance.resetAt))}
            </div>
          </div>
        )}
      </header>

      <nav className="mb-8">
        <ol className="flex items-center gap-2 sm:gap-3 text-sm">
          {[t.steps.choosePeople, t.steps.sceneStyle, t.steps.generate, t.steps.result].map(
            (label, i) => (
              <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                <span className="flex items-center gap-2">
                  <span
                    className={[
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                      i < step
                        ? "bg-amber-800 text-white"
                        : i === step
                          ? "bg-amber-900 text-white ring-4 ring-amber-900/10"
                          : "bg-stone-100 text-stone-400",
                    ].join(" ")}
                  >
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <span
                    className={[
                      "font-medium hidden sm:inline",
                      i <= step ? "text-stone-800" : "text-stone-400",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                </span>
                {i < 3 && <span className="h-px flex-1 bg-stone-200" />}
              </li>
            ),
          )}
        </ol>
      </nav>

      {step === 0 && (
        <section>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-stone-900">
                  {t.picker.title}
                </h2>
                <p className="text-stone-500 text-sm mt-1">{t.picker.subtitle}</p>
                <p className="text-stone-400 text-xs mt-1.5">{t.picker.maxNote}</p>
                {capFlash && (
                  <div className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
                    {t.picker.capNote}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-semibold text-amber-900">
                  {selectedIds.length}
                  <span className="text-stone-300">/{FAMILY_PICTURE_MAX_MEMBERS}</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
                  {t.picker.selected}
                </div>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t.picker.searchPlaceholder}
                autoComplete="off"
                className="w-full rounded-xl border border-stone-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800/40"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {membersError && (
              <p className="text-sm text-red-600 mb-4">{membersError}</p>
            )}

            {members === null ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-2xl border border-stone-100 bg-stone-50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <Search className="w-8 h-8 mx-auto mb-3 text-stone-300" />
                <p className="text-sm">
                  {t.picker.emptyResult.replace("{query}", query)}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {pagedMembers.map((member) => {
                  const decision = eligibility.get(member.id);
                  const isEligible = decision?.eligible ?? false;
                  const isSelected = selectedIds.includes(member.id);
                  const years = member.isLiving
                    ? member.birthYear
                      ? `b. ${member.birthYear}`
                      : ""
                    : member.birthYear || member.deathYear
                      ? `${member.birthYear ?? "?"} – ${member.deathYear ?? "?"}`
                      : "";

                  return (
                    <button
                      key={member.id}
                      type="button"
                      disabled={!isEligible}
                      onClick={() => isEligible && toggleMember(member.id)}
                      className={[
                        "text-left relative rounded-2xl border p-4 transition-all",
                        !isEligible
                          ? "border-stone-100 bg-stone-50/60 cursor-not-allowed"
                          : isSelected
                            ? "border-amber-700 bg-amber-50/70 ring-2 ring-amber-700/20 shadow-sm cursor-pointer"
                            : "border-stone-100 bg-white hover:border-amber-700/40 hover:shadow-sm cursor-pointer",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        {member.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.photoUrl}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover shrink-0 bg-stone-200 ring-1 ring-black/5"
                          />
                        ) : decision?.reason === "no-photo" ? (
                          <div className="w-12 h-12 rounded-full shrink-0 bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400">
                            <ImageOff className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full shrink-0 bg-amber-100 text-amber-900 flex items-center justify-center font-semibold text-sm">
                            {memberInitials(member)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div
                            className={[
                              "font-semibold text-sm leading-snug break-words",
                              isEligible ? "text-stone-900" : "text-stone-400",
                            ].join(" ")}
                          >
                            {memberDisplayName(member)}
                          </div>
                          <div
                            className={[
                              "text-xs leading-snug break-words",
                              isEligible ? "text-stone-500" : "text-stone-400",
                            ].join(" ")}
                          >
                            {years}
                          </div>
                        </div>
                      </div>
                      {!isEligible && decision?.reason && (
                        <div className="mt-3 text-[11px] text-stone-400 leading-snug">
                          {reasonLabel(decision.reason, t.picker)}
                        </div>
                      )}
                      {isSelected && (
                        <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {filteredMembers.length > PICKER_PAGE_SIZE && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="text-sm text-stone-500 tabular-nums">
                  {t.picker.showing
                    .replace(
                      "{from}",
                      String((safePage - 1) * PICKER_PAGE_SIZE + 1),
                    )
                    .replace(
                      "{to}",
                      String(
                        Math.min(
                          safePage * PICKER_PAGE_SIZE,
                          filteredMembers.length,
                        ),
                      ),
                    )
                    .replace("{total}", String(filteredMembers.length))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button
                    type="button"
                    aria-label={t.picker.prevPage}
                    disabled={safePage === 1}
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                    className="h-9 px-3 rounded-lg text-sm font-medium bg-white text-stone-600 border border-stone-200 hover:border-amber-700/40 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {t.picker.prevPage}
                  </button>
                  {pageWindow(safePage, totalPages).map((entry, i) =>
                    entry === "ellipsis" ? (
                      <span
                        key={`gap-${i}`}
                        className="px-1 text-stone-300 select-none"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={entry}
                        type="button"
                        aria-current={entry === safePage ? "page" : undefined}
                        onClick={() => setPage(entry)}
                        className={[
                          "min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-all active:scale-95",
                          entry === safePage
                            ? "bg-amber-900 text-white"
                            : "bg-white text-stone-600 border border-stone-200 hover:border-amber-700/40",
                        ].join(" ")}
                      >
                        {entry}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label={t.picker.nextPage}
                    disabled={safePage === totalPages}
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                    className="h-9 px-3 rounded-lg text-sm font-medium bg-white text-stone-600 border border-stone-200 hover:border-amber-700/40 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {t.picker.nextPage}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-stone-100 pt-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-700" />
                  {t.picker.legendEligible}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                  {t.picker.legendIneligible}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-stone-400">{t.picker.guestNote}</p>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => setStep(1)}
              className="bg-amber-900 text-white px-6 py-3 rounded-xl text-sm font-semibold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {t.picker.continue}
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-stone-900 mb-1">
                {t.presets.styleTitle}
              </h2>
              <p className="text-stone-500 text-sm mb-5">{t.presets.styleSubtitle}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setStylePreset(preset.id)}
                    className={[
                      "text-left rounded-xl border p-3.5 transition-all",
                      stylePreset === preset.id
                        ? "border-amber-700 bg-amber-50/70 ring-2 ring-amber-700/20 shadow-sm"
                        : "border-stone-100 bg-white hover:border-amber-700/40 hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "font-semibold text-sm",
                        stylePreset === preset.id ? "text-amber-900" : "text-stone-800",
                      ].join(" ")}
                    >
                      {preset.label}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">{preset.sub}</div>
                  </button>
                ))}
              </div>

              <h2 className="text-lg font-semibold text-stone-900 mt-8 mb-1">
                {t.presets.settingTitle}
              </h2>
              <p className="text-stone-500 text-sm mb-5">{t.presets.settingSubtitle}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SETTING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSettingChoice(preset.id)}
                    className={[
                      "text-left rounded-xl border p-3.5 transition-all",
                      settingChoice === preset.id
                        ? "border-amber-700 bg-amber-50/70 ring-2 ring-amber-700/20 shadow-sm"
                        : "border-stone-100 bg-white hover:border-amber-700/40 hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "font-semibold text-sm",
                        settingChoice === preset.id ? "text-amber-900" : "text-stone-800",
                      ].join(" ")}
                    >
                      {preset.label}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">{preset.sub}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSettingChoice(CUSTOM_SETTING)}
                  className={[
                    "text-left rounded-xl border p-3.5 transition-all",
                    settingChoice === CUSTOM_SETTING
                      ? "border-amber-700 bg-amber-50/70 ring-2 ring-amber-700/20 shadow-sm"
                      : "border-stone-300 border-dashed bg-white hover:border-amber-700/50 hover:shadow-sm",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "font-semibold text-sm",
                      settingChoice === CUSTOM_SETTING ? "text-amber-900" : "text-stone-800",
                    ].join(" ")}
                  >
                    {t.presets.somewhereSpecific}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {t.presets.somewhereSpecificSub}
                  </div>
                </button>
              </div>

              {settingChoice === CUSTOM_SETTING && (
                <div className="mt-3">
                  <div className="relative">
                    <input
                      value={customPlace}
                      onChange={(e) =>
                        setCustomPlace(
                          e.target.value.slice(0, FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH),
                        )
                      }
                      maxLength={FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH}
                      placeholder={t.presets.customPlacePlaceholder}
                      className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stone-300">
                      {customPlace.length}/{FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1.5">
                    {t.presets.customPlaceHint}
                  </p>
                </div>
              )}

              <h2 className="text-lg font-semibold text-stone-900 mt-8 mb-1">
                {t.presets.personalTouchTitle}{" "}
                <span className="text-stone-400 font-normal text-sm">
                  — {t.presets.personalTouchOptional}
                </span>
              </h2>
              <p className="text-stone-500 text-sm mb-3">
                {t.presets.personalTouchSubtitle}
              </p>
              <div className="relative">
                <input
                  value={personalTouch}
                  onChange={(e) =>
                    setPersonalTouch(
                      e.target.value.slice(0, FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH),
                    )
                  }
                  maxLength={FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH}
                  placeholder={t.presets.personalTouchPlaceholder}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800/40"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stone-300">
                  {personalTouch.length}/{FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 h-fit lg:sticky lg:top-24">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-4">
                {treeName}
              </h3>
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-2">
                  {t.picker.selected}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMembers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 text-xs bg-stone-100 text-stone-700 rounded-full pl-1 pr-2.5 py-1"
                    >
                      {m.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.photoUrl}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[9px] font-semibold">
                          {memberInitials(m)}
                        </span>
                      )}
                      {m.firstName}
                    </span>
                  ))}
                </div>
              </div>
              {submitError && (
                <p className="text-sm text-red-600 mt-2">{submitError}</p>
              )}
            </div>
          </div>

          {capReachedResetAt && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 mt-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                  <TriangleAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-950 text-sm">
                    {t.allowance.capReachedTitle.replace(
                      "{cap}",
                      String(MONTHLY_GENERATION_ALLOWANCE),
                    )}
                  </h4>
                  <p className="text-amber-900/80 text-sm mt-1">
                    {t.allowance.capReachedBody.replace(
                      "{date}",
                      formatAllowanceDate(capReachedResetAt),
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-6">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-stone-500 hover:text-amber-900 px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              {t.presets.back}
            </button>
            <button
              type="button"
              disabled={
                submitting ||
                (settingChoice === CUSTOM_SETTING && customPlace.trim().length === 0)
              }
              onClick={() => void handleSubmit()}
              className="bg-amber-900 text-white px-7 py-3 rounded-xl text-sm font-semibold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {t.presets.generateButton}
            </button>
          </div>
        </section>
      )}

      {step === 2 && <FamilyPictureGenerateStep t={t.progress} />}

      {step === 3 && generation && (
        <>
          <FamilyPictureResultStep
            t={t.result}
            imageUrl={generation.imageUrl}
            status={generation.status}
            onStartAnother={resetCreator}
            onTweak={(instruction) => void handleTweak(instruction)}
            tweaking={tweaking}
            tweakError={tweakError}
            tweakFailed={tweakFailed}
            versionsT={t.versions}
            versions={versions}
            onRevert={(versionNumber) => void handleRevert(versionNumber)}
            reverting={reverting}
          />
          {revertError && (
            <p className="text-sm text-red-600 mt-3">{revertError}</p>
          )}
          {tweakCapResetAt && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 mt-6 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                  <TriangleAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-950 text-sm">
                    {t.allowance.capReachedTitle.replace(
                      "{cap}",
                      String(MONTHLY_GENERATION_ALLOWANCE),
                    )}
                  </h4>
                  <p className="text-amber-900/80 text-sm mt-1">
                    {t.allowance.capReachedBody.replace(
                      "{date}",
                      formatAllowanceDate(tweakCapResetAt),
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <FamilyPictureGallery
        t={t.gallery}
        pictures={gallery}
        onView={(id) => setViewingId(id)}
      />

      {viewingPicture && viewingPicture.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewingId(null)}
        >
          <div
            className="relative max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewingId(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative rounded-xl overflow-hidden bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingPicture.imageUrl}
                alt=""
                className="w-full block"
              />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg">
                <Sparkles className="w-3.5 h-3.5" />
                {t.result.aiGenerated}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-white/70 text-xs">{t.result.privateNote}</p>
              <a
                href={toDownloadUrl(viewingPicture.imageUrl)}
                download
                title={t.result.download}
                aria-label={t.result.download}
                className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
