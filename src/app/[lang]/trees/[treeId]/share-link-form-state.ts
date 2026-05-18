export type ShareSettingsAction = "setEnabled" | "regenerate";

export function isShareSettingsAction(
  value: string,
): value is ShareSettingsAction {
  return value === "setEnabled" || value === "regenerate";
}

export function buildPublicUrl(baseUrl: string, shareToken: string): string {
  return `${baseUrl.replace(/\/$/, "")}/t/${shareToken}`;
}
