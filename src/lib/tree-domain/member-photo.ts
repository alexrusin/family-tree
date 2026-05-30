export function treeMemberPhotoApiPath(
  treeId: string,
  memberId: string,
): string {
  return `/api/trees/${encodeURIComponent(treeId)}/members/${encodeURIComponent(memberId)}/photo`;
}

export function resolveTreeMemberPhotoUrl(input: {
  treeId: string;
  memberId: string;
  photoKey: string | null;
  storedPhotoUrl: string | null;
}): string | null {
  if (!input.photoKey) {
    return input.storedPhotoUrl;
  }

  if (input.storedPhotoUrl?.startsWith("/api/trees/")) {
    return input.storedPhotoUrl;
  }

  return treeMemberPhotoApiPath(input.treeId, input.memberId);
}
