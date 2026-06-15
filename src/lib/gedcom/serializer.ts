export type GedcomSex = "M" | "F" | "X" | "U";

export interface GedcomIndividual {
  xrefId: string;
  givenName: string;
  surname: string;
  sex?: GedcomSex;
  birthDate?: string;
  deathDate?: string;
  note?: string;
}

export interface GedcomFamily {
  xrefId: string;
  husbandXrefId?: string;
  wifeXrefId?: string;
  childXrefIds: string[];
  divorced?: boolean;
}

export interface GedcomDocument {
  individuals: GedcomIndividual[];
  families?: GedcomFamily[];
}

const LINE_BREAK = "\r\n";
const MAX_LINE_LENGTH = 200;

function chunkLine(line: string): string[] {
  if (line.length === 0) return [""];

  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += MAX_LINE_LENGTH) {
    chunks.push(line.slice(i, i + MAX_LINE_LENGTH));
  }
  return chunks;
}

function pushNoteLines(lines: string[], note: string): void {
  const rawLines = note.split("\n");

  rawLines.forEach((rawLine, lineIndex) => {
    const chunks = chunkLine(rawLine);

    chunks.forEach((chunk, chunkIndex) => {
      if (lineIndex === 0 && chunkIndex === 0) {
        lines.push(`1 NOTE ${chunk}`);
      } else if (chunkIndex === 0) {
        lines.push(`2 CONT ${chunk}`);
      } else {
        lines.push(`2 CONC ${chunk}`);
      }
    });
  });
}

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

    if (individual.sex) {
      lines.push(`1 SEX ${individual.sex}`);
    }

    if (individual.birthDate) {
      lines.push("1 BIRT");
      lines.push(`2 DATE ${individual.birthDate}`);
    }

    if (individual.deathDate) {
      lines.push("1 DEAT");
      lines.push(`2 DATE ${individual.deathDate}`);
    }

    if (individual.note) {
      pushNoteLines(lines, individual.note);
    }
  }

  for (const family of document.families ?? []) {
    lines.push(`0 @${family.xrefId}@ FAM`);

    if (family.husbandXrefId) {
      lines.push(`1 HUSB @${family.husbandXrefId}@`);
    }

    if (family.wifeXrefId) {
      lines.push(`1 WIFE @${family.wifeXrefId}@`);
    }

    for (const childXrefId of family.childXrefIds) {
      lines.push(`1 CHIL @${childXrefId}@`);
    }

    if (family.divorced) {
      lines.push("1 DIV Y");
    }
  }

  lines.push("0 TRLR");

  return lines.join(LINE_BREAK) + LINE_BREAK;
}
