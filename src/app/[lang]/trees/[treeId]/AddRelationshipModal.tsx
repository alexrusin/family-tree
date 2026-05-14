"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type RelationshipType = "parent" | "child" | "spouse" | "sibling";

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

interface AddRelationshipModalProps {
  isOpen: boolean;
  treeId: string;
  members: MemberOption[];
  onClose: () => void;
  onRelationshipCreated: () => void;
}

function mapRelationshipErrorCode(errorCode: string | null): string {
  switch (errorCode) {
    case "ERR_INVALID_RELATIONSHIP":
      return "Please choose two members and a relationship type.";
    case "ERR_SELF_RELATIONSHIP":
      return "A member cannot be in a relationship with themselves.";
    case "ERR_DUPLICATE_RELATIONSHIP":
      return "This relationship already exists.";
    case "ERR_FORBIDDEN":
      return "You do not have permission to add relationships.";
    default:
      return "Unable to add relationship. Please try again.";
  }
}

export default function AddRelationshipModal({
  isOpen,
  treeId,
  members,
  onClose,
  onRelationshipCreated,
}: AddRelationshipModalProps) {
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("parent");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFromMemberId("");
    setToMemberId("");
    setRelationshipType("parent");
    setError(null);
  }, [isOpen]);

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
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!fromMemberId || !toMemberId) {
      setError("Please choose two members.");
      return;
    }

    if (fromMemberId === toMemberId) {
      setError("Please choose two different members.");
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
        const data = (await response.json().catch(() => null)) as
          | { errorCode?: string }
          | null;
        throw new Error(data?.errorCode || "ERR_UNKNOWN");
      }

      onClose();
      onRelationshipCreated();
    } catch (submitError) {
      const errorCode =
        submitError instanceof Error ? submitError.message : null;
      setError(mapRelationshipErrorCode(errorCode));
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
              Add Relationship
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              Connect two members in this tree.
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
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              Member A
            </label>
            <select
              value={fromMemberId}
              onChange={(event) => setFromMemberId(event.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
              disabled={isLoading}
            >
              <option value="">Select member</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              Member B
            </label>
            <select
              value={toMemberId}
              onChange={(event) => setToMemberId(event.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
              disabled={isLoading}
            >
              <option value="">Select member</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              Relationship Type
            </label>
            <select
              value={relationshipType}
              onChange={(event) =>
                setRelationshipType(event.target.value as RelationshipType)
              }
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
              disabled={isLoading}
            >
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="spouse">Spouse</option>
              <option value="sibling">Sibling</option>
            </select>
          </div>

          {members.length < 2 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                At least two members are required to create a relationship.
              </p>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || members.length < 2}
              className="flex-1 px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Relationship"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
