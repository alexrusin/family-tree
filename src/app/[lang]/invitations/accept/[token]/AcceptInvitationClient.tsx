"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type AcceptState = "loading" | "error";

function getCopy(lang: string, errorCode: string | null) {
  const isRu = lang === "ru";

  if (errorCode === "ERR_INVITATION_EMAIL_MISMATCH") {
    return {
      title: isRu ? "Email не совпадает" : "Email mismatch",
      body: isRu
        ? "Это приглашение отправлено на другой email. Войдите под нужным аккаунтом."
        : "This invitation was sent to a different email. Sign in with the invited account.",
    };
  }

  if (errorCode === "ERR_INVITATION_EXPIRED") {
    return {
      title: isRu ? "Срок приглашения истек" : "Invitation expired",
      body: isRu
        ? "Это приглашение больше не действительно. Попросите владельца дерева отправить новое."
        : "This invitation is no longer valid. Ask the tree owner to send a new one.",
    };
  }

  if (errorCode === "ERR_INVITATION_NOT_FOUND") {
    return {
      title: isRu ? "Приглашение не найдено" : "Invitation not found",
      body: isRu
        ? "Проверьте ссылку из письма или запросите новое приглашение."
        : "Check the link from your email or request a new invitation.",
    };
  }

  if (errorCode === "ERR_UNAUTHORIZED") {
    return {
      title: isRu ? "Нужно войти в аккаунт" : "Sign in required",
      body: isRu
        ? "Чтобы принять приглашение, сначала войдите или зарегистрируйтесь."
        : "To accept this invitation, sign in or create an account first.",
    };
  }

  return {
    title: isRu ? "Не удалось принять приглашение" : "Could not accept invitation",
    body: isRu
      ? "Произошла ошибка. Попробуйте еще раз через несколько секунд."
      : "Something went wrong. Please try again in a few seconds.",
  };
}

interface AcceptInvitationClientProps {
  lang: string;
  token: string;
}

export default function AcceptInvitationClient({
  lang,
  token,
}: AcceptInvitationClientProps) {
  const router = useRouter();
  const [state, setState] = useState<AcceptState>("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const callbackPath = useMemo(
    () => `/${lang}/invitations/accept/${token}`,
    [lang, token],
  );
  const callbackQuery = useMemo(
    () => `?callback=${encodeURIComponent(callbackPath)}`,
    [callbackPath],
  );

  const loginHref = useMemo(
    () => `/${lang}/login${callbackQuery}`,
    [lang, callbackQuery],
  );
  const registerHref = useMemo(
    () => `/${lang}/register${callbackQuery}`,
    [lang, callbackQuery],
  );
  const dashboardHref = useMemo(() => `/${lang}/dashboard`, [lang]);

  const accept = useCallback(async () => {
    setState("loading");
    setErrorCode(null);

    try {
      const response = await fetch(
        `/api/invitations/${encodeURIComponent(token)}/accept`,
        {
          method: "POST",
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; treeId?: string; errorCode?: string }
        | null;

      if (response.ok && payload?.success && payload.treeId) {
        router.replace(`/${lang}/trees/${payload.treeId}`);
        return;
      }

      setErrorCode(payload?.errorCode ?? "ERR_INTERNAL");
      setState("error");
    } catch {
      setErrorCode("ERR_INTERNAL");
      setState("error");
    }
  }, [lang, router, token]);

  useEffect(() => {
    void accept();
  }, [accept]);

  if (state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-on-background">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full border-4 border-primary-container border-t-primary animate-spin" />
          <h1 className="text-headline-lg text-primary mt-6">
            {lang === "ru" ? "Принимаем приглашение" : "Accepting invitation"}
          </h1>
          <p className="mt-3 text-on-surface-variant">
            {lang === "ru"
              ? "Подождите немного, мы проверяем ваш доступ."
              : "Please wait while we verify your access."}
          </p>
        </div>
      </main>
    );
  }

  const copy = getCopy(lang, errorCode);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-on-background">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl p-8 text-center">
        <span className="material-symbols-outlined text-error text-4xl" aria-hidden="true">
          error
        </span>
        <h1 className="text-headline-lg text-primary mt-4">{copy.title}</h1>
        <p className="mt-3 text-on-surface-variant">{copy.body}</p>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={() => {
              void accept();
            }}
            className="w-full py-3 px-5 bg-primary-container text-on-primary rounded-lg text-label-md hover:bg-primary transition-all"
          >
            {lang === "ru" ? "Попробовать снова" : "Try again"}
          </button>

          {errorCode === "ERR_UNAUTHORIZED" ? (
            <>
              <Link
                href={loginHref}
                className="w-full py-3 px-5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-bright transition-all"
              >
                {lang === "ru" ? "Войти" : "Log in"}
              </Link>
              <Link
                href={registerHref}
                className="w-full py-3 px-5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-bright transition-all"
              >
                {lang === "ru" ? "Зарегистрироваться" : "Register"}
              </Link>
            </>
          ) : (
            <Link
              href={dashboardHref}
              className="w-full py-3 px-5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-bright transition-all"
            >
              {lang === "ru" ? "На дашборд" : "Go to dashboard"}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
