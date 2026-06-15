"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { TreeRelationship } from "@/lib/tree-domain/tree-layout";
import { OPPOSITE_STATUS_TYPE } from "@/lib/tree-domain/relationship-canonical";

type RelationshipType = "parent" | "child" | "spouse" | "divorced" | "sibling";

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
  divorced: string;
  sibling: string;
  searchMembers: string;
  noMembersFound: string;
  needTwoMembers: string;
  willReplaceSpouse: string;
  willReplaceDivorced: string;
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
  relationships: TreeRelationship[];
  onClose: () => void;
  onRelationshipCreated: (relationship: TreeRelationship) => void;
  t: RelationshipT;
}

interface SelectOption {
  id: string;
  label: string;
}

interface MemberComboboxProps {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyState: string;
  disabled?: boolean;
  onChange: (memberId: string) => void;
}

function MemberCombobox({
  label,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyState,
  disabled = false,
  onChange,
}: MemberComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const listboxId = `${label.replace(/\s+/g, "-").toLowerCase()}-listbox`;

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery("");
  };

  const handleSelect = (memberId: string) => {
    onChange(memberId);
    closeDropdown();
  };

  const handleToggle = () => {
    if (isOpen) {
      closeDropdown();
      return;
    }
    const activeIndex = options.findIndex((option) => option.id === value);
    setHighlightedIndex(activeIndex >= 0 ? activeIndex : 0);
    setIsOpen(true);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const clampedHighlightedIndex =
      filteredOptions.length === 0
        ? 0
        : Math.min(highlightedIndex, filteredOptions.length - 1);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!filteredOptions.length) return;
      setHighlightedIndex((clampedHighlightedIndex + 1) % filteredOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!filteredOptions.length) return;
      setHighlightedIndex(
        (clampedHighlightedIndex - 1 + filteredOptions.length) %
          filteredOptions.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const highlightedOption = filteredOptions[clampedHighlightedIndex];
      if (highlightedOption) {
        handleSelect(highlightedOption.id);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  };

  return (
    <div ref={containerRef}>
      <label className="block text-sm font-semibold text-stone-900 mb-2">
        {label}
      </label>
      {!isOpen ? (
        <button
          type="button"
          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-left text-stone-900 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleToggle}
          aria-haspopup="listbox"
          aria-expanded={false}
          aria-controls={listboxId}
          disabled={disabled}
        >
          {selectedOption?.label ?? placeholder}
        </button>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={searchPlaceholder}
            role="combobox"
            aria-expanded={true}
            aria-controls={listboxId}
            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent transition-all text-stone-900"
          />
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg">
            <ul id={listboxId} role="listbox" className="max-h-56 overflow-y-auto py-1">
              {filteredOptions.length ? (
                filteredOptions.map((option, index) => {
                  const isHighlighted =
                    index ===
                    Math.min(highlightedIndex, filteredOptions.length - 1);
                  const isSelected = option.id === value;
                  return (
                    <li key={option.id} role="none">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => handleSelect(option.id)}
                        className={`w-full px-3 py-2 text-left text-sm ${
                          isHighlighted
                            ? "bg-amber-100 text-stone-900"
                            : "text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-2 text-sm text-stone-500">{emptyState}</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
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
  relationships,
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

  const fromMemberOptions = useMemo(
    () => memberOptions.filter((member) => member.id !== toMemberId),
    [memberOptions, toMemberId],
  );

  const toMemberOptions = useMemo(
    () => memberOptions.filter((member) => member.id !== fromMemberId),
    [fromMemberId, memberOptions],
  );

  const replaceNotice = useMemo(() => {
    const oppositeType = OPPOSITE_STATUS_TYPE[relationshipType];
    if (!oppositeType || !fromMemberId || !toMemberId) {
      return null;
    }

    const hasOpposite = relationships.some(
      (relationship) =>
        relationship.type === oppositeType &&
        ((relationship.fromMemberId === fromMemberId &&
          relationship.toMemberId === toMemberId) ||
          (relationship.fromMemberId === toMemberId &&
            relationship.toMemberId === fromMemberId)),
    );

    if (!hasOpposite) {
      return null;
    }

    return oppositeType === "spouse" ? t.willReplaceSpouse : t.willReplaceDivorced;
  }, [relationshipType, fromMemberId, toMemberId, relationships, t]);

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

      const data = (await response.json().catch(() => null)) as {
        relationship?: TreeRelationship;
        errorCode?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.errorCode || "ERR_UNKNOWN");
      }

      if (!data?.relationship) {
        throw new Error("ERR_UNKNOWN");
      }

      resetForm();
      onClose();
      onRelationshipCreated(data.relationship);
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
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-stone-100 overflow-visible">
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
          <MemberCombobox
            label={t.memberA}
            value={fromMemberId}
            options={fromMemberOptions}
            placeholder={t.selectMember}
            searchPlaceholder={t.searchMembers}
            emptyState={t.noMembersFound}
            disabled={isLoading}
            onChange={(memberId) => {
              setFromMemberId(memberId);
              if (memberId === toMemberId) {
                setToMemberId("");
              }
            }}
          />

          <MemberCombobox
            label={t.memberB}
            value={toMemberId}
            options={toMemberOptions}
            placeholder={t.selectMember}
            searchPlaceholder={t.searchMembers}
            emptyState={t.noMembersFound}
            disabled={isLoading}
            onChange={(memberId) => setToMemberId(memberId)}
          />

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
              <option value="divorced">{t.divorced}</option>
              <option value="sibling">{t.sibling}</option>
            </select>
          </div>

          {replaceNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">{replaceNotice}</p>
            </div>
          )}

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
