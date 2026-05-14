export function formatPublicBirthLabel(input: {
  isLiving: boolean;
  birthYear: number | null;
  locale: "en" | "ru";
}): string {
  const prefix = input.locale === "ru" ? "р." : "b.";

  if (input.isLiving) {
    return `${prefix} ••••`;
  }

  if (!input.birthYear) {
    return input.locale === "ru" ? "р. неизвестно" : "b. unknown";
  }

  return `${prefix} ${input.birthYear}`;
}
