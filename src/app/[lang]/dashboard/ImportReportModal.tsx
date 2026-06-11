"use client";

import { Users } from "lucide-react";
import type { ImportReport } from "@/lib/gedcom/import-mapper";

interface ImportReportModalProps {
  report: ImportReport | null;
  onClose: () => void;
  t: {
    title: string;
    description: string;
    peopleImported: string;
    close: string;
  };
}

export default function ImportReportModal({
  report,
  onClose,
  t,
}: ImportReportModalProps) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-xl font-semibold text-stone-900">{t.title}</h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-stone-600">{t.description}</p>

          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-900">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-stone-500">{t.peopleImported}</p>
              <p className="text-2xl font-semibold text-stone-900">
                {report.importedCount}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
