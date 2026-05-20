import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import UserMenu from "./UserMenu";
import { getCurrentUser } from "@/lib/auth-utils";

interface HeaderProps {
  lang: string;
  langToggleLabel: string;
  langToggleErrors: {
    ERR_INVALID_LOCALE: string;
    ERR_UNAUTHORIZED: string;
    ERR_USER_NOT_FOUND: string;
    ERR_UPDATE_FAILED: string;
    ERR_INTERNAL: string;
    generic: string;
    [key: string]: string;
  };
  navFamilyTree: string;
  navGallery: string;
  navSettings: string;
  logoutLabel: string;
}

export default async function Header({
  lang,
  langToggleLabel,
  langToggleErrors,
  navFamilyTree,
  navSettings,
  logoutLabel,
}: HeaderProps) {
  const user = await getCurrentUser();
  const avatarLabel = user?.name?.trim() || user?.email?.trim() || "User";
  const avatarFallback = avatarLabel.charAt(0).toUpperCase() || "A";

  return (
    <header className="bg-[#FAFAF9] flex justify-between items-center w-full px-6 py-3 border-b border-stone-200 shadow-sm shadow-amber-900/5 fixed top-0 z-50">
      <div className="flex items-center gap-8">
        <Link
          href={`/${lang}`}
          className="text-xl font-bold text-amber-900 tracking-tight hover:opacity-80 transition-opacity"
        >
          Generations
        </Link>
        <nav className="hidden md:flex gap-1 items-center">
          <Link
            href={`/${lang}/dashboard`}
            className="text-amber-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors active:scale-95 duration-200"
          >
            {navFamilyTree}
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <LanguageToggle
          label={langToggleLabel}
          currentLang={lang}
          persistLocalePreference={Boolean(user)}
          errorMessages={langToggleErrors}
        />
        <UserMenu
          lang={lang}
          navSettings={navSettings}
          logoutLabel={logoutLabel}
          avatarLabel={avatarLabel}
          avatarFallback={avatarFallback}
          avatarImage={user?.image}
        />
      </div>
    </header>
  );
}
