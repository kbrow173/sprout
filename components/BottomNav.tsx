"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarHeart, Sprout, Plus, Settings } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: typeof Sprout;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const TABS: Tab[] = [
    { href: "/", label: t("today"), icon: CalendarHeart },
    { href: "/garden", label: t("garden"), icon: Sprout },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-4 items-end px-3 pt-2 pb-2">
        <NavItem tab={TABS[0]} active={isActive(pathname, TABS[0].href)} />
        <NavItem tab={TABS[1]} active={isActive(pathname, TABS[1].href)} />

        {/* Center action — raised, unmissable, the heart of the app */}
        <div className="flex justify-center">
          <Link
            href="/add"
            aria-label={t("addPlant")}
            className="group -mt-8 flex size-16 items-center justify-center rounded-full bg-forest-700 text-white shadow-[0_10px_24px_-8px_rgba(31,91,57,0.6)] ring-4 ring-canvas transition-transform active:scale-95"
          >
            <Plus
              className="size-7 transition-transform group-hover:rotate-90"
              strokeWidth={2.5}
            />
          </Link>
        </div>

        <NavItem tab={TABS[2]} active={isActive(pathname, TABS[2].href)} />
      </div>
    </nav>
  );
}

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[0.68rem] font-semibold transition-colors ${
        active ? "text-forest-700" : "text-faint hover:text-muted"
      }`}
    >
      <Icon
        className="size-6"
        strokeWidth={active ? 2.4 : 2}
        aria-hidden="true"
      />
      {tab.label}
    </Link>
  );
}
