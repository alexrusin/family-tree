"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  initialMemberFormState,
  type MemberFormState,
  validateMemberPhotoSelection,
} from "./member-form-state";
import MemberDateSection from "./MemberDateSection";

interface MemberT {
  addTitle: string;
  addSubtitle: string;
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
  closeModal: string;
  cancel: string;
  saving: string;
  add: string;
  errors: {
    ERR_FIRST_NAME_REQUIRED: string;
    ERR_MEMBER_LIMIT_REACHED: string;
    ERR_IMAGE_TOO_LARGE: string;
    ERR_UNSUPPORTED_IMAGE_TYPE: string;
    ERR_FORBIDDEN: string;
    ERR_DEATH_BEFORE_BIRTH: string;
    ERR_INVALID_PARTIAL_DATE: string;
    memberGeneric: string;
    [key: string]: string;
  };
}

interface AddMemberModalProps {
  isOpen: boolean;
  treeId: string;
  onClose: () => void;
  onMemberCreated: () => void;
  t: MemberT;
}

function mapMemberErrorCode(
  errorCode: string | null,
  errors: MemberT["errors"],
): string {
  if (errorCode && errorCode in errors) {
    return errors[errorCode];
  }
  return errors.memberGeneric;
}

export default function AddMemberModal({
  isOpen,
  treeId,
  onClose,
  onMemberCreated,
  t,
}: AddMemberModalProps) {
  const [formState, setFormState] = useState<MemberFormState>(
    initialMemberFormState(),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormState(initialMemberFormState());
    setSelectedFile(null);
    setError(null);
    setPhotoError(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => {
      firstNameRef.current?.focus();
    }, 100);
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) {
      return;
    }
    resetForm();
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

    setPhotoError(validationError);
    if (!validationError) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formState.firstName.trim()) {
      setError(t.errors.ERR_FIRST_NAME_REQUIRED);
      return;
    }

    if (photoError) {
      setError(mapMemberErrorCode(photoError, t.errors));
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("firstName", formState.firstName.trim());
      formData.append("lastName", formState.lastName.trim());
      formData.append("gender", formState.gender);
      formData.append("bio", formState.bio.trim());
      formData.append("isLiving", String(formState.isLiving));

      if (formState.birthYear.trim()) {
        formData.append("birthPrecision", formState.birthPrecision);
        formData.append("birthYear", formState.birthYear.trim());
        if (
          (formState.birthPrecision === "month" ||
            formState.birthPrecision === "day") &&
          formState.birthMonth.trim()
        ) {
          formData.append("birthMonth", formState.birthMonth.trim());
        }
        if (formState.birthPrecision === "day" && formState.birthDay.trim()) {
          formData.append("birthDay", formState.birthDay.trim());
        }
      }

      if (formState.deathYear.trim()) {
        formData.append("deathPrecision", formState.deathPrecision);
        formData.append("deathYear", formState.deathYear.trim());
        if (
          (formState.deathPrecision === "month" ||
            formState.deathPrecision === "day") &&
          formState.deathMonth.trim()
        ) {
          formData.append("deathMonth", formState.deathMonth.trim());
        }
        if (formState.deathPrecision === "day" && formState.deathDay.trim()) {
          formData.append("deathDay", formState.deathDay.trim());
        }
      }

      if (selectedFile) {
        formData.append("photo", selectedFile);
      }

      const response = await fetch(`/api/trees/${treeId}/members`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          errorCode?: string;
        } | null;
        throw new Error(data?.errorCode ?? "ERR_UNKNOWN");
      }

      resetForm();
      onClose();
      onMemberCreated();
    } catch (submitError) {
      const errorCode =
        submitError instanceof Error ? submitError.message : null;
      setError(mapMemberErrorCode(errorCode, t.errors));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-amber-900/10 px-4 pt-20 pb-4 backdrop-blur-sm sm:items-center sm:py-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden max-h-[calc(100vh-6rem)] overflow-y-auto sm:max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {t.addTitle}
            </h2>
            <p className="text-sm text-stone-500 mt-1">{t.addSubtitle}</p>
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
          {/* Name row */}
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
                  setFormState((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
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
                  setFormState((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
                placeholder={t.lastNamePlaceholder}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Gender + is-living */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                {t.gender}
              </label>
              <select
                value={formState.gender}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    gender: e.target.value as MemberFormState["gender"],
                  }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
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
                id="isLiving"
                checked={formState.isLiving}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    isLiving: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
                disabled={isLoading}
              />
              <label htmlFor="isLiving" className="text-sm text-stone-700">
                {t.isLiving}
              </label>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.bio}
            </label>
            <textarea
              value={formState.bio}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  bio: e.target.value.slice(0, 1000),
                }))
              }
              rows={3}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900 placeholder-stone-400 resize-none"
              placeholder={t.bioPlaceholder}
              disabled={isLoading}
            />
          </div>

          {/* Birth date */}
          <MemberDateSection
            label={t.birthSection}
            precision={formState.birthPrecision}
            year={formState.birthYear}
            month={formState.birthMonth}
            day={formState.birthDay}
            isLoading={isLoading}
            t={t}
            onPrecisionChange={(v) =>
              setFormState((prev) => ({ ...prev, birthPrecision: v }))
            }
            onYearChange={(v) =>
              setFormState((prev) => ({ ...prev, birthYear: v }))
            }
            onMonthChange={(v) =>
              setFormState((prev) => ({ ...prev, birthMonth: v }))
            }
            onDayChange={(v) =>
              setFormState((prev) => ({ ...prev, birthDay: v }))
            }
          />

          {/* Death date (only when not living) */}
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
                setFormState((prev) => ({ ...prev, deathPrecision: v }))
              }
              onYearChange={(v) =>
                setFormState((prev) => ({ ...prev, deathYear: v }))
              }
              onMonthChange={(v) =>
                setFormState((prev) => ({ ...prev, deathMonth: v }))
              }
              onDayChange={(v) =>
                setFormState((prev) => ({ ...prev, deathDay: v }))
              }
            />
          )}

          {/* Photo */}
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.profilePhoto}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
              disabled={isLoading}
            />
            {photoError && (
              <p className="mt-2 text-sm text-red-600">
                {mapMemberErrorCode(photoError, t.errors)}
              </p>
            )}
          </div>

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
              className="flex-1 px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.saving}
                </>
              ) : (
                t.add
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
