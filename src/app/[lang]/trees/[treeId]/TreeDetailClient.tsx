"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Users, Link2 } from "lucide-react";
import AddMemberModal from "./AddMemberModal";
import AddRelationshipModal from "./AddRelationshipModal";

interface TreeMember {
  id: string;
  firstName: string;
  lastName: string | null;
  isLiving: boolean;
}

type RelationshipType = "parent" | "spouse" | "sibling";

interface Relationship {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
}

interface TreeT {
  addMember: string;
  addRelationship: string;
  viewOnly: string;
  membersSection: string;
  relationshipsSection: string;
  loadingMembers: string;
  loadingRelationships: string;
  noMembers: string;
  noRelationships: string;
  living: string;
  notLiving: string;
  cancel: string;
  saving: string;
  member: {
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
  };
  relationship: {
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
  };
  errors: {
    ERR_FIRST_NAME_REQUIRED: string;
    ERR_IMAGE_TOO_LARGE: string;
    ERR_UNSUPPORTED_IMAGE_TYPE: string;
    ERR_DUPLICATE_RELATIONSHIP: string;
    ERR_SELF_RELATIONSHIP: string;
    ERR_FORBIDDEN: string;
    ERR_INVALID_RELATIONSHIP: string;
    ERR_DEATH_BEFORE_BIRTH: string;
    ERR_INVALID_PARTIAL_DATE: string;
    memberGeneric: string;
    relationshipGeneric: string;
    loadFailed: string;
    chooseTwoMembers: string;
    chooseDifferentMembers: string;
  };
}

interface TreeDetailClientProps {
  treeId: string;
  treeName: string;
  canEdit: boolean;
  initialMemberCount: number;
  lastEdit: string;
  t: TreeT;
}

function formatMemberDisplayName(
  member: Pick<TreeMember, "firstName" | "lastName">,
) {
  return `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`;
}

export default function TreeDetailClient({
  treeId,
  treeName,
  canEdit,
  initialMemberCount,
  lastEdit,
  t,
}: TreeDetailClientProps) {
  const [members, setMembers] = useState<TreeMember[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false);

  const loadTreeData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [membersResponse, relationshipsResponse] = await Promise.all([
        fetch(`/api/trees/${treeId}/members`, { cache: "no-store" }),
        fetch(`/api/trees/${treeId}/relationships`, { cache: "no-store" }),
      ]);

      if (!membersResponse.ok || !relationshipsResponse.ok) {
        throw new Error("ERR_LOAD_FAILED");
      }

      const membersData = (await membersResponse.json()) as {
        members?: TreeMember[];
      };
      const relationshipsData = (await relationshipsResponse.json()) as {
        relationships?: Relationship[];
      };

      setMembers(membersData.members ?? []);
      setRelationships(relationshipsData.relationships ?? []);
    } catch (_loadError) {
      setError(t.errors.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, [treeId, t.errors.loadFailed]);

  useEffect(() => {
    void loadTreeData();
  }, [loadTreeData]);

  const memberCount = isLoading ? initialMemberCount : members.length;

  const membersById = useMemo(
    () =>
      new Map(
        members.map((member) => [member.id, formatMemberDisplayName(member)]),
      ),
    [members],
  );

  return (
    <>
      <AddMemberModal
        isOpen={isAddMemberOpen}
        treeId={treeId}
        onClose={() => setIsAddMemberOpen(false)}
        onMemberCreated={loadTreeData}
        t={{
          ...t.member,
          cancel: t.cancel,
          saving: t.saving,
          add: t.addMember,
          errors: t.errors,
        }}
      />

      <AddRelationshipModal
        isOpen={isAddRelationshipOpen}
        treeId={treeId}
        members={members}
        onClose={() => setIsAddRelationshipOpen(false)}
        onRelationshipCreated={loadTreeData}
        t={{
          ...t.relationship,
          cancel: t.cancel,
          saving: t.saving,
          add: t.addRelationship,
          errors: t.errors,
        }}
      />

      <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-tight text-amber-900">
              {treeName}
            </h1>
            <p className="text-sm text-stone-500 mt-2">
              {memberCount} members • Last edit {lastEdit}
            </p>
          </div>

          {canEdit ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t.addMember}
              </button>
              <button
                onClick={() => setIsAddRelationshipOpen(true)}
                className="px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                {t.addRelationship}
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold self-start">
              {t.viewOnly}
            </span>
          )}
        </div>
      </section>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-amber-900" />
            <h2 className="text-xl font-semibold text-stone-900">
              {t.membersSection}
            </h2>
          </div>

          {isLoading ? (
            <p className="text-sm text-stone-500">{t.loadingMembers}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-stone-500">{t.noMembers}</p>
          ) : (
            <ul className="space-y-3">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-stone-800">
                    {formatMemberDisplayName(member)}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      member.isLiving
                        ? "bg-green-50 text-green-700"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {member.isLiving ? t.living : t.notLiving}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-amber-900" />
            <h2 className="text-xl font-semibold text-stone-900">
              {t.relationshipsSection}
            </h2>
          </div>

          {isLoading ? (
            <p className="text-sm text-stone-500">{t.loadingRelationships}</p>
          ) : relationships.length === 0 ? (
            <p className="text-sm text-stone-500">{t.noRelationships}</p>
          ) : (
            <ul className="space-y-3">
              {relationships.map((relationship) => (
                <li
                  key={relationship.id}
                  className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3"
                >
                  <p className="text-sm text-stone-700">
                    <span className="font-semibold text-stone-900">
                      {membersById.get(relationship.fromMemberId) ||
                        relationship.fromMemberId}
                    </span>{" "}
                    is {relationship.type} of{" "}
                    <span className="font-semibold text-stone-900">
                      {membersById.get(relationship.toMemberId) ||
                        relationship.toMemberId}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

