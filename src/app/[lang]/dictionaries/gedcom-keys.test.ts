import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";
import ru from "./ru.json";

describe("gedcom dictionary keys", () => {
  it.each([
    ["English", en],
    ["Spanish", es],
    ["Russian", ru],
  ])("contains GEDCOM export strings in %s", (_locale, dict) => {
    expect(dict.tree.sidebar.exportGedcom).toBeTruthy();
    expect(dict.tree.errors.exportFailed).toBeTruthy();
  });

  it.each([
    ["English", en],
    ["Spanish", es],
    ["Russian", ru],
  ])("contains GEDCOM import modal strings in %s", (_locale, dict) => {
    expect(dict.dashboard.importTree).toBeTruthy();
    expect(dict.dashboard.importModal.title).toBeTruthy();
    expect(dict.dashboard.importModal.description).toBeTruthy();
    expect(dict.dashboard.importModal.fileLabel).toBeTruthy();
    expect(dict.dashboard.importModal.fileHint).toBeTruthy();
    expect(dict.dashboard.importModal.cancel).toBeTruthy();
    expect(dict.dashboard.importModal.submit).toBeTruthy();
    expect(dict.dashboard.importModal.submitting).toBeTruthy();
    expect(dict.dashboard.importModal.errorNoFile).toBeTruthy();
    expect(dict.dashboard.importModal.errorGeneric).toBeTruthy();
    expect(dict.dashboard.importModal.errorTooManyMembers).toBeTruthy();
    expect(dict.dashboard.importModal.errorFileTooLarge).toBeTruthy();
    expect(dict.dashboard.importModal.errorUnsupportedEncoding).toBeTruthy();
    expect(dict.dashboard.importModal.errorInvalidGedcom).toBeTruthy();
  });

  it.each([
    ["English", en],
    ["Spanish", es],
    ["Russian", ru],
  ])("contains GEDCOM import report strings in %s", (_locale, dict) => {
    expect(dict.dashboard.importReport.title).toBeTruthy();
    expect(dict.dashboard.importReport.description).toBeTruthy();
    expect(dict.dashboard.importReport.peopleImported).toBeTruthy();
    expect(dict.dashboard.importReport.relationshipsImported).toBeTruthy();
    expect(dict.dashboard.importReport.skippedSectionTitle).toBeTruthy();
    expect(dict.dashboard.importReport.skippedPlaces).toBeTruthy();
    expect(dict.dashboard.importReport.skippedEvents).toBeTruthy();
    expect(dict.dashboard.importReport.skippedSources).toBeTruthy();
    expect(dict.dashboard.importReport.skippedNotes).toBeTruthy();
    expect(dict.dashboard.importReport.close).toBeTruthy();
  });
});
