"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface ForgotPasswordTranslations {
  title: string;
  body: string;
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  submitting: string;
  successMessage: string;
  backToLogin: string;
  errors: {
    requiredEmail: string;
    invalidEmail: string;
    generic: string;
  };
}

interface ForgotPasswordClientProps {
  lang: string;
  t: ForgotPasswordTranslations;
}

interface FormErrors {
  email?: string;
  form?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordClient({
  lang,
  t,
}: ForgotPasswordClientProps) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const loginHref = useMemo(() => `/${lang}/login`, [lang]);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = t.errors.requiredEmail;
    } else if (!isValidEmail(email)) {
      nextErrors.email = t.errors.invalidEmail;
    }

    return nextErrors;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = (await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `/${lang}/reset-password`,
      })) as { error?: { message?: string } };

      if (response.error) {
        setErrors({ form: t.errors.generic });
        return;
      }

      setIsSuccess(true);
      setErrors({});
    } catch {
      setErrors({ form: t.errors.generic });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-on-background">
      <div className="grid lg:grid-cols-2 gap-12 max-w-5xl w-full items-center">
        <div className="hidden lg:block">
          <div className="relative rounded-xl overflow-hidden shadow-xl">
            <Image
              alt="Family heirloom"
              className="w-full h-[500px] object-cover"
              loading="eager"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbs28OUgp-no4P0_93yxDW2Njxs6DNKNMbWbb8ByQLa9kxeGx-ANjDUIQ2kXSdp9foGxTKa7UaO78axEJe7ssZtivluwqdzlSlWX87R2nTdlgG19woZPldWSN6kITUrk6--GFCaUfjZ-hPHp6KeaPwvxgnj-bMGlpZ8ozcovVGbrxEhXIIgDFs_qR0u56_Rwgr0UychHJLpSqlxf5S82ni3QFVJuQ3Wwy4RFcwPG5OwVdFtgpIyFugOvqaEut1wNqx5DC1-H4zigQ"
              width={1200}
              height={800}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent flex items-end p-8">
              <p className="text-white text-headline-md leading-tight">
                Your story is worth remembering.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-xl border border-outline-variant/40">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-fixed mb-4 text-primary">
                <span className="material-symbols-outlined" aria-hidden="true">
                  lock_reset
                </span>
              </div>
              <h1 className="text-headline-lg text-primary mb-2">{t.title}</h1>
              <p className="text-on-surface-variant">{t.body}</p>
            </div>

            {isSuccess ? (
              <div className="rounded-lg border border-primary/20 bg-primary-fixed/20 text-on-background p-4 text-sm">
                {t.successMessage}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6" noValidate>
                <div>
                  <label
                    className="block text-label-md text-on-surface-variant mb-2"
                    htmlFor="email"
                  >
                    {t.emailLabel}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="w-full px-4 py-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all bg-surface-container-lowest"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email ? (
                    <p className="text-sm text-error mt-2">{errors.email}</p>
                  ) : null}
                </div>

                {errors.form ? (
                  <p className="text-sm text-error">{errors.form}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary-container text-on-primary py-4 px-6 rounded-lg text-label-md hover:bg-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.submitting : t.submit}
                </button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-outline-variant/40 text-center">
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary transition-all"
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  aria-hidden="true"
                >
                  {"\u2190"}
                </span>
                {t.backToLogin}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
