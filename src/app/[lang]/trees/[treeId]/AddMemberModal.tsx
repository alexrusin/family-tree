"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  initialMemberFormState,
  type MemberFormState,
  validateMemberPhotoSelection,
} from "./member-form-state";

interface AddMemberModalProps {
  isOpen: boolean;
  treeId: string;
  onClose: () => void;
  onMemberCreated: () => void;
}

function mapMemberErrorCode(errorCode: string | null): string {
  switch (errorCode) {
    case "ERR_FIRST_NAME_REQUIRED":
      return "First name is required.";
    case "ERR_FORBIDDEN":
      return "You do not have permission to add members.";
    default:
      return "Unable to add member. Please try again.";
  }
}

function mapPhotoValidationError(errorCode: string | null): string {
  if (errorCode === "ERR_UNSUPPORTED_IMAGE_TYPE") {
    return "Only JPEG, PNG, or WebP images are supported.";
  }
  if (errorCode === "ERR_IMAGE_TOO_LARGE") {
    return "Image must be 5MB or smaller.";
  }
  return "";
}

export default function AddMemberModal({
  isOpen,
  treeId,
  onClose,
  onMemberCreated,
}: AddMemberModalProps) {
  const [formState, setFormState] = useState<MemberFormState>(
    initialMemberFormState(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState(initialMemberFormState());
    setError(null);
    setPhotoError(null);

    setTimeout(() => {
      firstNameRef.current?.focus();
    }, 100);
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) {
      return;
    }
    onClose();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      setPhotoError(null);
      return;
    }

    const validationError = validateMemberPhotoSelection({
      sizeBytes: selectedFile.size,
      contentType: selectedFile.type,
    });

    setPhotoError(validationError);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formState.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (photoError) {
      setError(mapPhotoValidationError(photoError));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formState.firstName.trim(),
          lastName: formState.lastName.trim() || undefined,
          isLiving: formState.isLiving,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { errorCode?: string }
          | null;
        throw new Error(data?.errorCode || "ERR_UNKNOWN");
      }

      onClose();
      onMemberCreated();
    } catch (submitError) {
      const errorCode =
        submitError instanceof Error ? submitError.message : null;
      setError(mapMemberErrorCode(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Add Member</h2>
            <p className="text-sm text-stone-500 mt-1">
              Add a person to this family tree.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                First Name
              </label>
              <input
                ref={firstNameRef}
                type="text"
                value={formState.firstName}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
                placeholder="e.g., Elena"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formState.lastName}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    lastName: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900 placeholder-stone-400"
                placeholder="Optional"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Birth Precision
              </label>
              <select
                value={formState.birthPrecision}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    birthPrecision: event.target.value as MemberFormState["birthPrecision"],
                  }))
                }
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
                disabled={isLoading}
              >
                <option value="year">Year</option>
                <option value="month">Month</option>
                <option value="day">Day</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Profile Photo (Optional)
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
                  {mapPhotoValidationError(photoError)}
                </p>
              )}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={formState.isLiving}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  isLiving: event.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
              disabled={isLoading}
            />
            Living member
          </label>

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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Member"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
