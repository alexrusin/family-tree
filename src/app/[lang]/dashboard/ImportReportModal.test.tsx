/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ImportReportModal from "./ImportReportModal";
import type { ImportReport } from "@/lib/gedcom/import-mapper";

const t = {
  title: "Import Complete",
  description: "Your new family tree was created from the uploaded file.",
  peopleImported: "People imported",
  relationshipsImported: "Relationships imported",
  skippedSectionTitle: "Skipped data",
  skippedPlaces: "Places skipped",
  skippedEvents: "Events skipped",
  skippedSources: "Sources skipped",
  skippedNotes: "Notes skipped",
  close: "Go to tree",
};

const baseReport: ImportReport = {
  importedCount: 5,
  unknownNameCount: 0,
  relationshipCount: 3,
  droppedDateCount: 0,
  inferredLivingCount: 0,
  danglingRelationshipCount: 0,
  skippedPlacesCount: 0,
  skippedEventsCount: 0,
  skippedSourcesCount: 0,
  skippedNotesCount: 0,
};

describe("ImportReportModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when there is no report", () => {
    const { container } = render(
      <ImportReportModal report={null} onClose={() => {}} t={t} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows imported counts and hides the skipped section when nothing was skipped", () => {
    render(
      <ImportReportModal report={baseReport} onClose={() => {}} t={t} />,
    );

    expect(screen.getByText("Import Complete")).not.toBeNull();
    expect(screen.getByText("People imported")).not.toBeNull();
    expect(screen.getByText("5")).not.toBeNull();
    expect(screen.getByText("Relationships imported")).not.toBeNull();
    expect(screen.getByText("3")).not.toBeNull();
    expect(screen.queryByText("Skipped data")).toBeNull();
  });

  it("lists each skipped category with a non-zero count", () => {
    render(
      <ImportReportModal
        report={{
          ...baseReport,
          skippedPlacesCount: 2,
          skippedEventsCount: 0,
          skippedSourcesCount: 1,
          skippedNotesCount: 4,
        }}
        onClose={() => {}}
        t={t}
      />,
    );

    expect(screen.getByText("Skipped data")).not.toBeNull();
    expect(screen.getByText("Places skipped")).not.toBeNull();
    expect(screen.getByText("Sources skipped")).not.toBeNull();
    expect(screen.getByText("Notes skipped")).not.toBeNull();
    expect(screen.queryByText("Events skipped")).toBeNull();
  });
});
