// src/app/[lang]/trees/[treeId]/EditMemberModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  type MemberFormState,
  type BirthPrecision,
  validateMemberPhotoSelection,
} from "./member-form-state";
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
  profilePhoto: string;
  isLiving: string;
  update: string;
  closeModal: string;
  currentPhotoAlt: string;
  addPhoto: string;
  updatePhoto: string;
  cancel: string;
  saving: string;
  errors: {
    ERR_FIRST_NAME_REQUIRED: string;
    ERR_IMAGE_TOO_LARGE: string;
    ERR_UNSUPPORTED_IMAGE_TYPE: string;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => firstNameRef.current?.focus(), 100);
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setPhotoError(null);
      return;
    }

    const validationError = validateMemberPhotoSelection({
      sizeBytes: file.size,
      contentType: file.type,
    });

    if (validationError) {
      setSelectedFile(null);
      setPhotoError(validationError);
      return;
    }

    setSelectedFile(file);
    setPhotoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formState.firstName.trim()) {
      setError(t.errors.ERR_FIRST_NAME_REQUIRED);
      return;
    }
    if (photoError) {
      setError(mapError(photoError, t.errors));
      return;
    }
    setIsLoading(true);
    try {
      const body = new FormData();
      body.append("firstName", formState.firstName.trim());
      body.append("lastName", formState.lastName.trim());
      body.append("gender", formState.gender);
      body.append("bio", formState.bio.trim());
      body.append("isLiving", String(formState.isLiving));
      if (formState.birthYear.trim()) {
        body.append("birthPrecision", formState.birthPrecision);
        body.append("birthYear", formState.birthYear.trim());
        if (formState.birthPrecision !== "year" && formState.birthMonth.trim()) {
          body.append("birthMonth", formState.birthMonth.trim());
        }
        if (formState.birthPrecision === "day" && formState.birthDay.trim()) {
          body.append("birthDay", formState.birthDay.trim());
        }
      } else {
        body.append("birthPrecision", "");
        body.append("birthYear", "");
        body.append("birthMonth", "");
        body.append("birthDay", "");
      }
      if (!formState.isLiving && formState.deathYear.trim()) {
        body.append("deathPrecision", formState.deathPrecision);
        body.append("deathYear", formState.deathYear.trim());
        if (formState.deathPrecision !== "year" && formState.deathMonth.trim()) {
          body.append("deathMonth", formState.deathMonth.trim());
        }
        if (formState.deathPrecision === "day" && formState.deathDay.trim()) {
          body.append("deathDay", formState.deathDay.trim());
        }
      } else {
        body.append("deathPrecision", "");
        body.append("deathYear", "");
        body.append("deathMonth", "");
        body.append("deathDay", "");
      }
      if (selectedFile) {
        body.append("photo", selectedFile);
      }
      const res = await fetch(`/api/trees/${treeId}/members/${member.id}`, {
        method: "PATCH",
        body,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-amber-900/10 px-4 pt-20 pb-4 backdrop-blur-sm sm:items-center sm:py-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden max-h-[calc(100vh-6rem)] overflow-y-auto sm:max-h-[90vh]">
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
          {(member.photoUrl || selectedFile) && (
            <div className="flex items-center gap-3">
              {member.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photoUrl}
                  alt={t.currentPhotoAlt}
                  className="w-12 h-12 rounded-full object-cover border-2 border-stone-200"
                />
              )}
              {selectedFile && (
                <p className="text-sm text-stone-500">{selectedFile.name}</p>
              )}
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
            <label
              htmlFor="editMemberPhoto"
              className="block text-sm font-semibold text-stone-900 mb-2"
            >
              {member.photoUrl ? t.updatePhoto : t.addPhoto}
            </label>
            <p className="text-sm text-stone-500 mb-2">{t.profilePhoto}</p>
            <input
              id="editMemberPhoto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
              disabled={isLoading}
            />
            {photoError && (
              <p className="mt-2 text-sm text-red-600">
                {mapError(photoError, t.errors)}
              </p>
            )}
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
