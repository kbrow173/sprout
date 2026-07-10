import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ManualAddForm from "@/components/ManualAddForm";
import { getAllSpecies } from "@/lib/species";

// Reads live from Supabase; also avoids requiring DB env vars at build time.
export const dynamic = "force-dynamic";

export default async function ManualAddPage() {
  const species = await getAllSpecies();

  return (
    <>
      <Link
        href="/add"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-forest-700"
      >
        <ChevronLeft className="size-4" strokeWidth={2.4} />
        Back
      </Link>
      <PageHeader eyebrow="From our library" title="Choose a plant" />
      <ManualAddForm species={species} />
    </>
  );
}
