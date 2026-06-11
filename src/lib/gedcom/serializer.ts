export interface GedcomIndividual {
  xrefId: string;
  givenName: string;
  surname: string;
}

export interface GedcomDocument {
  individuals: GedcomIndividual[];
}

const LINE_BREAK = "\r\n";

export function serializeGedcom(document: GedcomDocument): string {
  const lines: string[] = [
    "0 HEAD",
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
  ];

  for (const individual of document.individuals) {
    lines.push(`0 @${individual.xrefId}@ INDI`);
    lines.push(`1 NAME ${individual.givenName} /${individual.surname}/`);
  }

  lines.push("0 TRLR");

  return lines.join(LINE_BREAK) + LINE_BREAK;
}
