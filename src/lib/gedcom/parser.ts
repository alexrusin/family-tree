export interface GedcomNode {
  level: number;
  tag: string;
  xrefId?: string;
  value: string;
  children: GedcomNode[];
}

const BOM = "﻿";

const LINE_PATTERN = /^(\d+) (?:@([^@]*)@ )?(\S+)(?: (.*))?$/;

export function parseGedcom(text: string): GedcomNode[] {
  const normalized = text.startsWith(BOM) ? text.slice(1) : text;
  const lines = normalized.split(/\r\n|\r|\n/);

  const roots: GedcomNode[] = [];
  const stack: GedcomNode[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(LINE_PATTERN);
    if (!match) continue;

    const level = Number(match[1]);
    const xrefId = match[2];
    const tag = match[3];
    const value = match[4] ?? "";

    if (tag === "CONC" || tag === "CONT") {
      const target = stack[level - 1];
      if (target) {
        target.value += (tag === "CONT" ? "\n" : "") + value;
      }
      continue;
    }

    const node: GedcomNode = { level, tag, xrefId, value, children: [] };

    if (level === 0) {
      roots.push(node);
    } else {
      const parent = stack[level - 1];
      parent?.children.push(node);
    }

    stack[level] = node;
    stack.length = level + 1;
  }

  return roots;
}
