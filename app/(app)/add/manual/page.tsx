import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import ManualAddForm from "@/components/ManualAddForm";
import { getSpeciesSummaries } from "@/lib/species";

// Reads live from Supabase; also avoids requiring DB env vars at build time.
export const dynamic = "force-dynamic";

export default async function ManualAddPage() {
  const [species, t] = await Promise.all([getSpeciesSummaries(), getTranslations("manualAdd")]);
  return (
    <>
      <Link href="/add" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-forest-700">
        <ChevronLeft className="size-4" strokeWidth={2.4} />
        {t("back")}
      </Link>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <ManualAddForm species={species} />
    </>
  );
}
