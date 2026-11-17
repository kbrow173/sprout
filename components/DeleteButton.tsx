"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DeleteButton({ plantLabel }: { plantLabel: string }) {
  const t = useTranslations("plant");
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(t("removeConfirm", { name: plantLabel }))) e.preventDefault();
      }}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-bloom-600 transition-colors hover:bg-bloom-100"
    >
      <Trash2 className="size-4" strokeWidth={2.2} />
      {t("removeButton")}
    </button>
  );
}
