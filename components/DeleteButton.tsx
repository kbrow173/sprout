"use client";

import { Trash2 } from "lucide-react";

export default function DeleteButton({ plantLabel }: { plantLabel: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(`Remove ${plantLabel} from your garden? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-bloom-500 transition-colors hover:bg-bloom-100"
    >
      <Trash2 className="size-4" strokeWidth={2.2} />
      Remove from garden
    </button>
  );
}
