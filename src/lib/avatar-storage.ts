export function avatarKeyForUser(userId: string): string {
  return `users/${userId}/avatar.webp`;
}

export function avatarApiPath(userId: string): string {
  return `/api/users/${encodeURIComponent(userId)}/avatar`;
}

export function resolveAvatarUrlForUser(
  userId: string,
  storedImage: string | null,
): string | null {
  if (!storedImage) {
    return null;
  }

  if (storedImage.startsWith("/api/users/")) {
    return storedImage;
  }

  const avatarKey = avatarKeyForUser(userId);
  if (storedImage === avatarKey || storedImage.endsWith(`/${avatarKey}`)) {
    return avatarApiPath(userId);
  }

  return storedImage;
}
