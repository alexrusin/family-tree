"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { buildPostVerificationRedirect } from "@/lib/auth-callback";

interface VerifyEmailTranslations {
  title: string;
  body: string;
  resend: string;
  resending: string;
  resendSuccess: string;
  resendError: string;
  missingEmail: string;
  changeEmail: string;
  wrongAddressPrompt: string;
  checkSpam: string;
}

interface VerifyEmailClientProps {
  lang: string;
  t: VerifyEmailTranslations;
}

type VerifyEmailStatus = "idle" | "success" | "error";

export default function VerifyEmailClient({ lang, t }: VerifyEmailClientProps) {
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() ?? "";
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState<VerifyEmailStatus>("idle");

  const registerHref = useMemo(() => `/${lang}/register`, [lang]);
  const verificationCallback = useMemo(
    () => buildPostVerificationRedirect(lang),
    [lang],
  );

  let statusCopy: { body: string; className: string } | null = null;

  if (status === "success") {
    statusCopy = {
      body: t.resendSuccess,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  } else if (status === "error") {
    statusCopy = {
      body: email ? t.resendError : t.missingEmail,
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  const onResend = async () => {
    if (!email) {
      setStatus("error");
      return;
    }

    setIsResending(true);
    setStatus("idle");

    try {
      const response = (await authClient.sendVerificationEmail({
        email,
        callbackURL: verificationCallback,
      })) as { error?: { message?: string } };

      if (response.error) {
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-on-background md:flex-row">
      <section className="relative hidden items-center justify-center bg-surface-container-high p-12 md:flex md:w-1/2">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, #92400e15 1px, transparent 0)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="relative max-w-md text-center">
          <h1 className="mb-4 text-display-md font-semibold text-primary">
            {t.title}
          </h1>
          <p className="text-body-lg text-on-surface-variant">{t.body}</p>
        </div>
      </section>

      <section className="flex w-full items-center justify-center px-6 py-10 md:w-1/2 md:p-16">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <h1 className="mb-2 text-[34px] font-semibold tracking-tight text-primary">
              {t.title}
            </h1>
            <p className="text-on-surface-variant">{t.body}</p>
          </div>

          {email ? (
            <div className="mb-5 rounded-lg border border-outline-variant bg-surface-bright px-4 py-4">
              <p className="truncate font-medium text-on-surface">{email}</p>
            </div>
          ) : null}

          <div className="space-y-5">
            <div className="rounded-lg border border-outline-variant bg-surface-bright px-4 py-4">
              <p className="text-sm leading-6 text-on-surface-variant">
                {t.wrongAddressPrompt}{" "}
                <Link
                  href={registerHref}
                  className="font-semibold text-primary hover:underline"
                >
                  {t.changeEmail}
                </Link>
              </p>
            </div>

            {statusCopy ? (
              <div className={`rounded-lg border px-4 py-4 text-sm ${statusCopy.className}`}>
                {statusCopy.body}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onResend}
              disabled={isResending}
              className="w-full rounded-lg bg-primary-container py-4 font-label-md text-label-md text-on-primary shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? t.resending : t.resend}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
