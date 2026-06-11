import type { GedcomIndividual } from "./serializer";

export interface ExportableMember {
  id: string;
  firstName: string;
  lastName?: string | null;
}

export function mapMembersToGedcomIndividuals(
  members: ExportableMember[],
): GedcomIndividual[] {
  return members.map((member, index) => ({
    xrefId: `I${index + 1}`,
    givenName: member.firstName.trim(),
    surname: member.lastName?.trim() ?? "",
  }));
}
