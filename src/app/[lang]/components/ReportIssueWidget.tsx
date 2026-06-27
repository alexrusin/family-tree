"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquareWarning, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface ReportIssueWidgetProps {
  lang: string;
  t: {
    button: string;
    title: string;
    close: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    submit: string;
    submitting: string;
    successMessage: string;
    errors: {
      ERR_DESCRIPTION_REQUIRED: string;
      ERR_DESCRIPTION_TOO_LONG: string;
      generic: string;
      [key: string]: string;
    };
  };
}

export default function ReportIssueWidget({ lang, t }: ReportIssueWidgetProps) {
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (isPending || !session) return null;

  function handleOpen() {
    setIsOpen(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const treeMatch = window.location.pathname.match(
        /\/[a-z]{2}\/trees\/([^/]+)/,
      );

      const res = await fetch("/api/issue-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          pageUrl: window.location.href,
          treeId: treeMatch ? treeMatch[1] : null,
          locale: lang,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const code = data.errorCode;
        setErrorMessage(t.errors[code] ?? t.errors.generic);
        return;
      }

      setSuccessMessage(t.successMessage);
      setDescription("");
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-30" ref={popoverRef}>
      {isOpen && (
        <div
          className="absolute bottom-14 right-0 w-80 rounded-xl border border-stone-200 bg-white p-4 shadow-xl"
          data-testid="report-issue-popover"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-amber-900">{t.title}</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="-mr-1 -mt-1 rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
              aria-label={t.close}
              data-testid="report-issue-close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="report-issue-description"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              {t.descriptionLabel}
            </label>
            <textarea
              id="report-issue-description"
              className="mb-3 w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              rows={4}
              maxLength={2000}
              placeholder={t.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
            {errorMessage && (
              <p
                className="mb-2 text-xs text-red-600"
                data-testid="report-issue-error"
              >
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p
                className="mb-2 text-xs text-green-700"
                data-testid="report-issue-success"
              >
                {successMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t.submitting : t.submit}
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={handleOpen}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-800 text-white shadow-lg transition-colors hover:bg-amber-900"
        aria-label={t.button}
        data-testid="report-issue-button"
      >
        <MessageSquareWarning className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
