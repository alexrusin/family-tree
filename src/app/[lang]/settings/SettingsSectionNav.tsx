"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SettingsSection = "account" | "language" | "security";

interface SettingsSectionNavProps {
  lang: string;
  labels: Record<SettingsSection, string>;
}

const SECTION_ORDER: SettingsSection[] = ["account", "language", "security"];

export default function SettingsSectionNav({
  lang,
  labels,
}: SettingsSectionNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="w-full">
      <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
        {SECTION_ORDER.map((section) => {
          const href = `/${lang}/settings/${section}`;
          const isActive = pathname === href;

          return (
            <li key={section} className="shrink-0 md:shrink">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`block rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {labels[section]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
