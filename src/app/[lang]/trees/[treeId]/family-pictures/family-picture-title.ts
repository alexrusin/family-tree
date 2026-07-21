interface MemberSnapshotLike {
  firstName: string;
}

export function familyPictureTitle(picture: { memberSnapshot: MemberSnapshotLike[] }): string {
  const names = picture.memberSnapshot.map((m) => m.firstName);
  if (names.length === 0) return "";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} & ${names.length - 2} more`;
}
