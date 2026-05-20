"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface UserMenuProps {
  lang: string;
  navSettings: string;
  logoutLabel: string;
  avatarLabel: string;
  avatarFallback: string;
  avatarImage?: string | null;
}

export default function UserMenu({
  lang,
  navSettings,
  logoutLabel,
  avatarLabel,
  avatarFallback,
  avatarImage,
}: UserMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  const onLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsOpen(false);
    setIsSigningOut(true);

    try {
      await authClient.signOut();
    } finally {
      router.replace(`/${lang}/login`);
      router.refresh();
      setIsSigningOut(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open user menu"
        onClick={() => setIsOpen((previous) => !previous)}
        className="w-9 h-9 rounded-full bg-amber-100 border-2 border-primary-container flex items-center justify-center text-amber-900 font-semibold text-sm select-none overflow-hidden"
      >
        {avatarImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarImage}
            alt={avatarLabel}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          avatarFallback
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 min-w-40 rounded-xl border border-stone-200 bg-white shadow-lg shadow-amber-900/10 py-1 z-50"
        >
          <Link
            href={`/${lang}/settings/account`}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 transition-colors"
          >
            {navSettings}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            disabled={isSigningOut}
            className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {logoutLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
