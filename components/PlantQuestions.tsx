"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { Plant, PotMaterial, PotSize, SpeciesCare } from "@/lib/types";

// Stored values stay English on purpose: wateringPrior (lib/care-math.ts)
// reads them by keyword. Only the labels are translated.
const LIGHT_CHIPS = [
  { value: "Bright direct sun", key: "lightDirect" },
  { value: "Bright indirect light", key: "lightBrightIndirect" },
  { value: "Medium light", key: "lightMedium" },
  { value: "Low light", key: "lightLow" },
] as const;
const MATERIALS: PotMaterial[] = ["plastic", "terracotta", "ceramic", "fabric"];
const SIZES: PotSize[] = ["small", "medium", "large"];

type Initial = Partial<
  Pick<Plant, "nickname" | "potted" | "has_drainage" | "soil_mix" | "light_location" | "acquired_at" | "pot_material" | "pot_size" | "notes">
>;

/**
 * The plant questions + submit button. Shared by ManualAddForm and
 * AddPlantFlow (create) and the plant edit page (edit). Must sit inside a
 * <form> whose action is createPlantAction / updatePlantAction. Pot details
 * become the starting watering prior (L36).
 */
export default function PlantQuestions({
  species,
  photoUrl,
  mode = "create",
  initial,
}: {
  species: Pick<SpeciesCare, "id" | "common_name" | "soil_recommendation">;
  photoUrl?: string | null;
  mode?: "create" | "edit";
  initial?: Initial;
}) {
  const t = useTranslations("plantQuestions");
  const [potted, setPotted] = useState(initial?.potted ?? true);
  const [light, setLight] = useState<string | null>(initial?.light_location ?? null);
  const [material, setMaterial] = useState<PotMaterial | null>(initial?.pot_material ?? null);
  const [size, setSize] = useState<PotSize | null>(initial?.pot_size ?? null);
  const inputCls =
    "mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none ring-forest-500 placeholder:text-faint focus:ring-2";

  return (
    <div className="animate-pop space-y-6">
      {mode === "create" ? (
        <>
          <input type="hidden" name="care_species_id" value={species.id} />
          <input type="hidden" name="photo_url" value={photoUrl ?? ""} />
        </>
      ) : null}
      <input type="hidden" name="potted" value={potted ? "true" : "false"} />
      <input type="hidden" name="light_location" value={light ?? ""} />
      <input type="hidden" name="pot_material" value={material ?? ""} />
      <input type="hidden" name="pot_size" value={size ?? ""} />

      <fieldset>
        <Legend>{t("isPotted")}</Legend>
        <div className="mt-2 flex gap-2">
          <ToggleButton active={potted} onClick={() => setPotted(true)}>
            {t("pottedYes")}
          </ToggleButton>
          <ToggleButton active={!potted} onClick={() => setPotted(false)}>
            {t("pottedNo")}
          </ToggleButton>
        </div>
      </fieldset>

      {potted ? (
        <section className="space-y-4">
          <div>
            <Label htmlFor="soil_mix">{t("soilMix")}</Label>
            <input
              id="soil_mix"
              name="soil_mix"
              type="text"
              maxLength={200}
              defaultValue={mode === "edit" ? (initial?.soil_mix ?? "") : ""}
              placeholder={t("soilPlaceholder", { recommendation: species.soil_recommendation })}
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              name="has_drainage"
              defaultChecked={initial?.has_drainage ?? true}
              className="size-5 rounded-md border-line accent-forest-700"
            />
            {t("hasDrainage")}
          </label>
          <fieldset>
            <Legend>{t("potMaterial")}</Legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <ToggleButton key={m} active={material === m} onClick={() => setMaterial(material === m ? null : m)}>
                  {t(`material_${m}`)}
                </ToggleButton>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <Legend>{t("potSize")}</Legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <ToggleButton key={s} active={size === s} onClick={() => setSize(size === s ? null : s)}>
                  {t(`size_${s}`)}
                </ToggleButton>
              ))}
            </div>
          </fieldset>
        </section>
      ) : (
        <section className="rounded-2xl bg-sun-100 px-4 py-3 text-sm text-ink">
          {t("recommendedMix")} <span className="font-bold">{species.soil_recommendation}</span>
        </section>
      )}

      <fieldset>
        <Legend>{t("whereLives")}</Legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LIGHT_CHIPS.map((chip) => (
            <ToggleButton key={chip.value} active={light === chip.value} onClick={() => setLight(light === chip.value ? null : chip.value)}>
              {t(chip.key)}
            </ToggleButton>
          ))}
        </div>
      </fieldset>

      <section className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="nickname">{t("nickname")}</Label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            maxLength={60}
            defaultValue={initial?.nickname ?? ""}
            placeholder={t("nicknamePlaceholder")}
            className={inputCls}
          />
        </div>
        <div>
          <Label htmlFor="acquired_at">{t("acquiredAt")}</Label>
          <input id="acquired_at" name="acquired_at" type="date" defaultValue={initial?.acquired_at ?? ""} className={inputCls} />
        </div>
      </section>

      {mode === "edit" ? (
        <div>
          <Label htmlFor="notes">{t("notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            maxLength={1000}
            defaultValue={initial?.notes ?? ""}
            placeholder={t("notesPlaceholder")}
            className={inputCls}
          />
        </div>
      ) : null}

      <SubmitButton>{mode === "edit" ? t("save") : t("submit", { name: species.common_name })}</SubmitButton>
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full rounded-full bg-forest-700 py-4 text-center text-sm font-bold text-white shadow-soft outline-none transition-transform focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-bold text-forest-800">
      {children}
    </label>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return <legend className="text-sm font-bold text-forest-800">{children}</legend>;
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
      aria-pressed={active}
      className={`rounded-full px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 ${
        active ? "bg-forest-700 text-white" : "bg-surface text-muted ring-1 ring-line hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
