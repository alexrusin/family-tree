"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

type RelationshipType = "parent" | "child" | "spouse" | "sibling";

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

interface RelationshipT {
  addTitle: string;
  addSubtitle: string;
  memberA: string;
  memberB: string;
  type: string;
  selectMember: string;
  parent: string;
  child: string;
  spouse: string;
  sibling: string;
  needTwoMembers: string;
  closeModal: string;
  cancel: string;
  saving: string;
  add: string;
  errors: {
    ERR_INVALID_RELATIONSHIP: string;
    ERR_SELF_RELATIONSHIP: string;
    ERR_DUPLICATE_RELATIONSHIP: string;
    ERR_FORBIDDEN: string;
    relationshipGeneric: string;
    chooseTwoMembers: string;
    chooseDifferentMembers: string;
    [key: string]: string;
  };
}

interface AddRelationshipModalProps {
  isOpen: boolean;
  treeId: string;
  members: MemberOption[];
  onClose: () => void;
  onRelationshipCreated: () => void;
  t: RelationshipT;
}

function mapRelationshipErrorCode(
  errorCode: string | null,
  errors: RelationshipT["errors"],
): string {
  if (errorCode && errorCode in errors) {
    return errors[errorCode];
  }
  return errors.relationshipGeneric;
}

export default function AddRelationshipModal({
  isOpen,
  treeId,
  members,
  onClose,
  onRelationshipCreated,
  t,
}: AddRelationshipModalProps) {
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("parent");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFromMemberId("");
    setToMemberId("");
    setRelationshipType("parent");
    setError(null);
  };

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        label: `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`,
      })),
    [members],
  );

  const handleClose = () => {
    if (isLoading) {
      return;
    }
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!fromMemberId || !toMemberId) {
      setError(t.errors.chooseTwoMembers);
      return;
    }

    if (fromMemberId === toMemberId) {
      setError(t.errors.chooseDifferentMembers);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMemberId,
          toMemberId,
          type: relationshipType,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          errorCode?: string;
        } | null;
        throw new Error(data?.errorCode || "ERR_UNKNOWN");
      }

      resetForm();
      onClose();
      onRelationshipCreated();
    } catch (submitError) {
      const errorCode =
        submitError instanceof Error ? submitError.message : null;
      setError(mapRelationshipErrorCode(errorCode, t.errors));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden">
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
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.memberA}
            </label>
            <select
              value={fromMemberId}
              onChange={(event) => setFromMemberId(event.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
              disabled={isLoading}
            >
              <option value="">{t.selectMember}</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.memberB}
            </label>
            <select
              value={toMemberId}
              onChange={(event) => setToMemberId(event.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
              disabled={isLoading}
            >
              <option value="">{t.selectMember}</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.type}
            </label>
            <select
              value={relationshipType}
              onChange={(event) =>
                setRelationshipType(event.target.value as RelationshipType)
              }
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
              disabled={isLoading}
            >
              <option value="parent">{t.parent}</option>
              <option value="child">{t.child}</option>
              <option value="spouse">{t.spouse}</option>
              <option value="sibling">{t.sibling}</option>
            </select>
          </div>

          {members.length < 2 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">{t.needTwoMembers}</p>
            </div>
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
              className="flex-1 px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading || members.length < 2}
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
