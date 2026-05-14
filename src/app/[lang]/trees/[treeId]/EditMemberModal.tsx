// src/app/[lang]/trees/[treeId]/EditMemberModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { type MemberFormState, type BirthPrecision } from "./member-form-state";
import MemberDateSection from "./MemberDateSection";
import type { TreeMemberData } from "@/lib/tree-domain/tree-layout";

interface EditMemberT {
  editTitle: string;
  editSubtitle: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  gender: string;
  genderUndisclosed: string;
  genderMale: string;
  genderFemale: string;
  genderOther: string;
  bio: string;
  bioPlaceholder: string;
  birthSection: string;
  deathSection: string;
  precision: string;
  precisionYear: string;
  precisionMonth: string;
  precisionDay: string;
  yearLabel: string;
  monthLabel: string;
  dayLabel: string;
  isLiving: string;
  update: string;
  closeModal: string;
  currentPhotoAlt: string;
  photoEditingSoon: string;
  cancel: string;
  saving: string;
  errors: {
    ERR_FIRST_NAME_REQUIRED: string;
    ERR_FORBIDDEN: string;
    ERR_DEATH_BEFORE_BIRTH: string;
    ERR_INVALID_PARTIAL_DATE: string;
    memberGeneric: string;
    [key: string]: string;
  };
}

interface EditMemberModalProps {
  isOpen: boolean;
  treeId: string;
  member: TreeMemberData;
  onClose: () => void;
  onMemberUpdated: () => void;
  t: EditMemberT;
}

function memberToFormState(m: TreeMemberData): MemberFormState {
  return {
    firstName: m.firstName,
    lastName: m.lastName ?? "",
    gender: (m.gender as MemberFormState["gender"]) ?? "undisclosed",
    bio: m.bio ?? "",
    isLiving: m.isLiving,
    birthPrecision: (m.birthPrecision as BirthPrecision) ?? "year",
    birthYear: m.birthYear?.toString() ?? "",
    birthMonth: m.birthMonth?.toString() ?? "",
    birthDay: m.birthDay?.toString() ?? "",
    deathPrecision: (m.deathPrecision as BirthPrecision) ?? "year",
    deathYear: m.deathYear?.toString() ?? "",
    deathMonth: m.deathMonth?.toString() ?? "",
    deathDay: m.deathDay?.toString() ?? "",
  };
}

function mapError(code: string | null, errors: EditMemberT["errors"]): string {
  if (code && code in errors) return errors[code];
  return errors.memberGeneric;
}

export default function EditMemberModal({
  isOpen,
  treeId,
  member,
  onClose,
  onMemberUpdated,
  t,
}: EditMemberModalProps) {
  const [formState, setFormState] = useState<MemberFormState>(() =>
    memberToFormState(member),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => firstNameRef.current?.focus(), 100);
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formState.firstName.trim()) {
      setError(t.errors.ERR_FIRST_NAME_REQUIRED);
      return;
    }
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim() || null,
        gender: formState.gender,
        bio: formState.bio.trim() || null,
        isLiving: formState.isLiving,
      };
      if (formState.birthYear.trim()) {
        body.birthPrecision = formState.birthPrecision;
        body.birthYear = parseInt(formState.birthYear);
        if (formState.birthPrecision !== "year" && formState.birthMonth.trim())
          body.birthMonth = parseInt(formState.birthMonth);
        if (formState.birthPrecision === "day" && formState.birthDay.trim())
          body.birthDay = parseInt(formState.birthDay);
      } else {
        body.birthPrecision = null;
        body.birthYear = null;
        body.birthMonth = null;
        body.birthDay = null;
      }
      if (!formState.isLiving && formState.deathYear.trim()) {
        body.deathPrecision = formState.deathPrecision;
        body.deathYear = parseInt(formState.deathYear);
        if (formState.deathPrecision !== "year" && formState.deathMonth.trim())
          body.deathMonth = parseInt(formState.deathMonth);
        if (formState.deathPrecision === "day" && formState.deathDay.trim())
          body.deathDay = parseInt(formState.deathDay);
      } else {
        body.deathPrecision = null;
        body.deathYear = null;
        body.deathMonth = null;
        body.deathDay = null;
      }
      const res = await fetch(`/api/trees/${treeId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          errorCode?: string;
        } | null;
        throw new Error(data?.errorCode ?? "ERR_UNKNOWN");
      }
      onClose();
      onMemberUpdated();
    } catch (err) {
      setError(mapError(err instanceof Error ? err.message : null, t.errors));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {t.editTitle}
            </h2>
            <p className="text-sm text-stone-500 mt-1">{t.editSubtitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-100"
            aria-label={t.closeModal}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {member.photoUrl && (
            <div className="flex items-center gap-3">
              <img
                src={member.photoUrl}
                alt={t.currentPhotoAlt}
                className="w-12 h-12 rounded-full object-cover border-2 border-stone-200"
              />
              <p className="text-sm text-stone-500">{t.photoEditingSoon}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                {t.firstName}
              </label>
              <input
                ref={firstNameRef}
                type="text"
                value={formState.firstName}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, firstName: e.target.value }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent text-stone-900 placeholder-stone-400"
                placeholder={t.firstNamePlaceholder}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                {t.lastName}
              </label>
              <input
                type="text"
                value={formState.lastName}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, lastName: e.target.value }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent text-stone-900 placeholder-stone-400"
                placeholder={t.lastNamePlaceholder}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                {t.gender}
              </label>
              <select
                value={formState.gender}
                onChange={(e) =>
                  setFormState((p) => ({
                    ...p,
                    gender: e.target.value as MemberFormState["gender"],
                  }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 text-stone-900"
                disabled={isLoading}
              >
                <option value="undisclosed">{t.genderUndisclosed}</option>
                <option value="male">{t.genderMale}</option>
                <option value="female">{t.genderFemale}</option>
                <option value="other">{t.genderOther}</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="editIsLiving"
                checked={formState.isLiving}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, isLiving: e.target.checked }))
                }
                className="w-4 h-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
                disabled={isLoading}
              />
              <label htmlFor="editIsLiving" className="text-sm text-stone-700">
                {t.isLiving}
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.bio}
            </label>
            <textarea
              value={formState.bio}
              onChange={(e) =>
                setFormState((p) => ({
                  ...p,
                  bio: e.target.value.slice(0, 1000),
                }))
              }
              rows={3}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 text-stone-900 placeholder-stone-400 resize-none"
              placeholder={t.bioPlaceholder}
              disabled={isLoading}
            />
          </div>
          <MemberDateSection
            label={t.birthSection}
            precision={formState.birthPrecision}
            year={formState.birthYear}
            month={formState.birthMonth}
            day={formState.birthDay}
            isLoading={isLoading}
            t={t}
            onPrecisionChange={(v) =>
              setFormState((p) => ({ ...p, birthPrecision: v }))
            }
            onYearChange={(v) => setFormState((p) => ({ ...p, birthYear: v }))}
            onMonthChange={(v) =>
              setFormState((p) => ({ ...p, birthMonth: v }))
            }
            onDayChange={(v) => setFormState((p) => ({ ...p, birthDay: v }))}
          />
          {!formState.isLiving && (
            <MemberDateSection
              label={t.deathSection}
              precision={formState.deathPrecision}
              year={formState.deathYear}
              month={formState.deathMonth}
              day={formState.deathDay}
              isLoading={isLoading}
              t={t}
              onPrecisionChange={(v) =>
                setFormState((p) => ({ ...p, deathPrecision: v }))
              }
              onYearChange={(v) =>
                setFormState((p) => ({ ...p, deathYear: v }))
              }
              onMonthChange={(v) =>
                setFormState((p) => ({ ...p, deathMonth: v }))
              }
              onDayChange={(v) => setFormState((p) => ({ ...p, deathDay: v }))}
            />
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors disabled:opacity-60"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.saving}
                </>
              ) : (
                t.update
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
