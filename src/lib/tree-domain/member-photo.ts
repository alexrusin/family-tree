export function treeMemberPhotoApiPath(
  treeId: string,
  memberId: string,
): string {
  return `/api/trees/${encodeURIComponent(treeId)}/members/${encodeURIComponent(memberId)}/photo`;
}

// The /photo endpoint lives at a stable URL and is served with a short-lived
// cache. A replaced photo gets a brand-new photoKey (random UUID per upload),
// so we fold that key into a `v` query param: the URL changes whenever the
// photo changes, and the browser fetches the new image immediately instead of
// showing the stale cached one.
function photoCacheBustToken(photoKey: string): string {
  const basename = photoKey.split("/").pop() ?? photoKey;
  return basename.replace(/\.[^.]+$/, "");
}

function appendVersion(url: string, version: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
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

  const version = photoCacheBustToken(input.photoKey);

  if (input.storedPhotoUrl?.startsWith("/api/trees/")) {
    return appendVersion(input.storedPhotoUrl, version);
  }

  return appendVersion(
    treeMemberPhotoApiPath(input.treeId, input.memberId),
    version,
  );
}
