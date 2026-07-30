"use client";

import { useMemo, useState } from "react";
import { Search, Check, Loader2, Sparkles } from "lucide-react";
import { createPlantAction } from "@/lib/actions";
import PlantIllustration from "@/components/PlantIllustration";
import PlantQuestions, { Label } from "@/components/PlantQuestions";
import type { SpeciesCare } from "@/lib/types";

/**
 * Species-confirmation + a few quick questions, then saves the plant.
 * This is Phase 1's stand-in for the camera flow, and doubles as the
 * "which one is it?" step Phase 2 reuses when Claude's ID is uncertain.
 */
export default function ManualAddForm({ species }: { species: SpeciesCare[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SpeciesCare | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return species;
    return species.filter(
      (s) =>
        s.common_name.toLowerCase().includes(q) ||
        s.scientific_name.toLowerCase().includes(q)
    );
  }, [query, species]);

  async function generateForQuery() {
    const name = query.trim();
    if (!name) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/care-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ common_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate a care guide for that plant.");
      setSelected(data as SpeciesCare);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <form action={createPlantAction} className="space-y-6">
      <section>
        <Label>What kind of plant is it?</Label>
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint"
            strokeWidth={2.2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pothos, monstera, snake plant…"
            className="w-full rounded-full border border-line bg-surface py-3 pr-4 pl-10 text-sm outline-none ring-forest-500 placeholder:text-faint focus:ring-2"
          />
        </div>

        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto rounded-3xl border border-line bg-surface p-2 shadow-soft">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              No matches in our library.
            </p>
          ) : (
            filtered.map((s) => {
              const active = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                    active ? "bg-sprout-100 ring-1 ring-forest-500" : "hover:bg-surface-sunken"
                  }`}
                >
                  <PlantIllustration illustrationKey={s.illustration_key} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">
                      {s.common_name}
                    </span>
                    <span className="block truncate text-xs text-muted italic">
                      {s.scientific_name}
                    </span>
                  </span>
                  {active ? (
                    <Check className="size-5 shrink-0 text-forest-700" strokeWidth={2.4} />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {query.trim() && !selected ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={generateForQuery}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-sprout-300 bg-sprout-100/60 px-4 py-3 text-sm font-semibold text-forest-700 transition-colors hover:bg-sprout-100 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" strokeWidth={2.4} />
                  Asking Claude about &quot;{query.trim()}&quot;…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" strokeWidth={2.4} />
                  Can&apos;t find it? Generate a care guide for &quot;{query.trim()}&quot;
                </>
              )}
            </button>
            {generateError ? (
              <p className="mt-2 text-center text-xs font-medium text-red-600">{generateError}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {selected ? <PlantQuestions species={selected} /> : null}
    </form>
  );
}
