"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface VerifyEmailChangeTranslations {
  loadingTitle: string;
  loadingBody: string;
  successTitle: string;
  successBody: string;
  invalidTitle: string;
  invalidBody: string;
  expiredTitle: string;
  expiredBody: string;
  emailInUseTitle: string;
  emailInUseBody: string;
  genericTitle: string;
  genericBody: string;
  retry: string;
  goToLogin: string;
  goToSettings: string;
}

type VerifyState = "loading" | "success" | "error";

function getErrorCopy(
  errorCode: string | null,
  t: VerifyEmailChangeTranslations,
): { title: string; body: string } {
  if (errorCode === "ERR_EMAIL_CHANGE_TOKEN_INVALID") {
    return {
      title: t.invalidTitle,
      body: t.invalidBody,
    };
  }

  if (errorCode === "ERR_EMAIL_CHANGE_TOKEN_EXPIRED") {
    return {
      title: t.expiredTitle,
      body: t.expiredBody,
    };
  }

  if (errorCode === "ERR_EMAIL_IN_USE") {
    return {
      title: t.emailInUseTitle,
      body: t.emailInUseBody,
    };
  }

  return {
    title: t.genericTitle,
    body: t.genericBody,
  };
}

interface VerifyEmailChangeClientProps {
  lang: string;
  token: string;
  t: VerifyEmailChangeTranslations;
}

export default function VerifyEmailChangeClient({
  lang,
  token,
  t,
}: VerifyEmailChangeClientProps) {
  const [state, setState] = useState<VerifyState>("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const loginHref = useMemo(() => `/${lang}/login`, [lang]);
  const settingsHref = useMemo(() => `/${lang}/settings/account`, [lang]);

  const verify = async () => {
    setState("loading");
    setErrorCode(null);

    try {
      const response = await fetch("/api/account/email-change/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        errorCode?: string;
      } | null;

      if (response.ok && payload?.success) {
        setState("success");
        return;
      }

      setErrorCode(payload?.errorCode ?? "ERR_INTERNAL");
      setState("error");
    } catch {
      setErrorCode("ERR_INTERNAL");
      setState("error");
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void verify();
    }, 0);

    return () => window.clearTimeout(timerId);
    // token is route-based and stable for this page instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-on-background">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full border-4 border-primary-container border-t-primary animate-spin" />
          <h1 className="text-headline-lg text-primary mt-6">
            {t.loadingTitle}
          </h1>
          <p className="mt-3 text-on-surface-variant">{t.loadingBody}</p>
        </div>
      </main>
    );
  }

  if (state === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-on-background">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl p-8 text-center">
          <span
            className="material-symbols-outlined text-primary text-4xl"
            aria-hidden="true"
          >
            check_circle
          </span>
          <h1 className="text-headline-lg text-primary mt-4">
            {t.successTitle}
          </h1>
          <p className="mt-3 text-on-surface-variant">{t.successBody}</p>

          <div className="mt-8 grid gap-3">
            <Link
              href={settingsHref}
              className="w-full py-3 px-5 rounded-lg bg-primary-container text-on-primary text-label-md hover:bg-primary transition-all"
            >
              {t.goToSettings}
            </Link>
            <Link
              href={loginHref}
              className="w-full py-3 px-5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-bright transition-all"
            >
              {t.goToLogin}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const copy = getErrorCopy(errorCode, t);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-on-background">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl p-8 text-center">
        <span
          className="material-symbols-outlined text-error text-4xl"
          aria-hidden="true"
        >
          error
        </span>
        <h1 className="text-headline-lg text-primary mt-4">{copy.title}</h1>
        <p className="mt-3 text-on-surface-variant">{copy.body}</p>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={() => {
              void verify();
            }}
            className="w-full py-3 px-5 bg-primary-container text-on-primary rounded-lg text-label-md hover:bg-primary transition-all"
          >
            {t.retry}
          </button>
          <Link
            href={settingsHref}
            className="w-full py-3 px-5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-bright transition-all"
          >
            {t.goToSettings}
          </Link>
        </div>
      </div>
    </main>
  );
}
