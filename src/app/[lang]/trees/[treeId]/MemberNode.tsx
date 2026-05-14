// src/app/[lang]/trees/[treeId]/MemberNode.tsx
"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  formatMemberDateRange,
  type MemberNodeData,
} from "@/lib/tree-domain/tree-layout";

export type MemberNodeType = Node<MemberNodeData, "member">;

function getInitials(firstName: string, lastName: string | null): string {
  return `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();
}

export const MemberNode = memo(function MemberNode({
  data,
  selected,
}: NodeProps<MemberNodeType>) {
  const { member } = data;
  const dateRange = formatMemberDateRange(member);
  const displayName = `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`;

  return (
    <div className="flex flex-col items-center" style={{ width: 120 }}>
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div
        className={`w-20 h-20 rounded-full overflow-hidden border-4 shadow-lg transition-transform duration-200 ${
          selected
            ? "border-amber-900 ring-2 ring-amber-900 ring-offset-2 scale-110"
            : "border-white hover:scale-105"
        }`}
      >
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-amber-100 flex items-center justify-center text-amber-900 font-semibold text-lg">
            {getInitials(member.firstName, member.lastName)}
          </div>
        )}
      </div>

      <p className="mt-2 text-xs font-semibold text-amber-900 text-center leading-tight max-w-[110px]">
        {displayName}
      </p>

      {dateRange && (
        <p className="text-[10px] text-stone-500 text-center mt-0.5">
          {dateRange}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});
