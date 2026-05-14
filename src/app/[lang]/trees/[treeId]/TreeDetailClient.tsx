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

interface TreeDetailClientProps {
  treeId: string;
  treeName: string;
  canEdit: boolean;
  initialMemberCount: number;
  lastEdit: string;
}

function formatMemberDisplayName(member: Pick<TreeMember, "firstName" | "lastName">) {
  return `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`;
}

export default function TreeDetailClient({
  treeId,
  treeName,
  canEdit,
  initialMemberCount,
  lastEdit,
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
      setError("Unable to load members and relationships.");
    } finally {
      setIsLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    void loadTreeData();
  }, [loadTreeData]);

  const memberCount = members.length || initialMemberCount;

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
      />

      <AddRelationshipModal
        isOpen={isAddRelationshipOpen}
        treeId={treeId}
        members={members}
        onClose={() => setIsAddRelationshipOpen(false)}
        onRelationshipCreated={loadTreeData}
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
                Add Member
              </button>
              <button
                onClick={() => setIsAddRelationshipOpen(true)}
                className="px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Add Relationship
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold self-start">
              View-only access
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
            <h2 className="text-xl font-semibold text-stone-900">Members</h2>
          </div>

          {isLoading ? (
            <p className="text-sm text-stone-500">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-stone-500">
              No members yet. Add your first member to begin.
            </p>
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
                    {member.isLiving ? "Living" : "Not living"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-amber-900" />
            <h2 className="text-xl font-semibold text-stone-900">Relationships</h2>
          </div>

          {isLoading ? (
            <p className="text-sm text-stone-500">Loading relationships...</p>
          ) : relationships.length === 0 ? (
            <p className="text-sm text-stone-500">
              No relationships yet. Add a relationship when at least two members
              exist.
            </p>
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
