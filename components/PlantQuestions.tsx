"use client";

import { useState } from "react";
import type { SpeciesCare } from "@/lib/types";

const LIGHT_CHIPS = [
  { value: "Bright direct sun", label: "☀️ Direct sun" },
  { value: "Bright indirect light", label: "🌤️ Bright indirect" },
  { value: "Medium light", label: "⛅ Medium light" },
  { value: "Low light", label: "🌥️ Low light" },
];

/**
 * The potted/soil/drainage/light/nickname question steps + submit button,
 * shared by ManualAddForm (species picked from the library) and AddPlantFlow
 * (species resolved via Claude ID). Must be rendered inside a
 * <form action={createPlantAction}>; also emits the care_species_id and
 * photo_url hidden inputs the action reads.
 */
export default function PlantQuestions({
  species,
  photoUrl,
}: {
  species: SpeciesCare;
  photoUrl?: string | null;
}) {
  const [potted, setPotted] = useState(true);
  const [light, setLight] = useState<string | null>(null);

  return (
    <div className="animate-pop space-y-6">
      <input type="hidden" name="care_species_id" value={species.id} />
      <input type="hidden" name="potted" value={potted ? "true" : "false"} />
      <input type="hidden" name="light_location" value={light ?? ""} />
      <input type="hidden" name="photo_url" value={photoUrl ?? ""} />

      <section>
        <Label>Is it potted?</Label>
        <div className="mt-2 flex gap-2">
          <ToggleButton active={potted} onClick={() => setPotted(true)}>
            Yes, potted
          </ToggleButton>
          <ToggleButton active={!potted} onClick={() => setPotted(false)}>
            Not yet
          </ToggleButton>
        </div>
      </section>

      {potted ? (
        <section className="space-y-3">
          <div>
            <Label htmlFor="soil_mix">What soil mix? (optional)</Label>
            <input
              id="soil_mix"
              name="soil_mix"
              type="text"
              placeholder={`Leave blank to use our pick: "${species.soil_recommendation}"`}
              className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none ring-forest-500 placeholder:text-faint focus:ring-2"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              name="has_drainage"
              defaultChecked
              className="size-5 rounded-md border-line accent-forest-700"
            />
            The pot has a drainage hole
          </label>
        </section>
      ) : (
        <section className="rounded-2xl bg-sun-100 px-4 py-3 text-sm text-ink">
          🪴 We&apos;ll recommend a mix for you:{" "}
          <span className="font-bold">{species.soil_recommendation}</span>
        </section>
      )}

      <section>
        <Label>Where does it live?</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {LIGHT_CHIPS.map((chip) => (
            <ToggleButton key={chip.value} active={light === chip.value} onClick={() => setLight(chip.value)}>
              {chip.label}
            </ToggleButton>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="nickname">Nickname (optional)</Label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            placeholder="e.g. Fernando"
            className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none ring-forest-500 placeholder:text-faint focus:ring-2"
          />
        </div>
        <div>
          <Label htmlFor="acquired_at">Got it on (optional)</Label>
          <input
            id="acquired_at"
            name="acquired_at"
            type="date"
            className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none ring-forest-500 focus:ring-2"
          />
        </div>
      </section>

      <button
        type="submit"
        className="w-full rounded-full bg-forest-700 py-4 text-center text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
      >
        Add {species.common_name} to my garden 🌱
      </button>
    </div>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-bold text-forest-800">
      {children}
    </label>
  );
}

export function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
        active ? "bg-forest-700 text-white" : "bg-surface text-muted ring-1 ring-line hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
