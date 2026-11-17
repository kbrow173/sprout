import Link from "next/link";
import { Leaf } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Unknown URL or a deleted plant. Root-level so it also catches unmatched routes. */
export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-sprout-100">
        <Leaf className="size-8 text-sprout-600" strokeWidth={2} />
      </div>
      <h1 className="text-xl font-bold text-forest-800">{t("notFoundTitle")}</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{t("notFoundBody")}</p>
      <Link href="/garden" className="mt-6 rounded-full bg-forest-700 px-6 py-3 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]">
        {t("notFoundCta")}
      </Link>
    </main>
  );
}
