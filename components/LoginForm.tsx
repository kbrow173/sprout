"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, LockOpen } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/auth-actions";

export default function LoginForm({ next }: { next: string }) {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: null });

  return (
    <form action={action} className="mt-7 w-full max-w-xs space-y-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="passcode" className="sr-only">
        {t("label")}
      </label>
      <input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        placeholder={t("placeholder")}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "passcode-error" : undefined}
        className="w-full rounded-full border border-line bg-surface px-5 py-3.5 text-center text-base outline-none ring-forest-500 placeholder:text-faint focus:ring-2"
      />
      {state.error ? (
        <p id="passcode-error" role="alert" className="text-sm font-semibold text-bloom-600">
          {t("wrong")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 py-3.5 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" strokeWidth={2.4} /> : <LockOpen className="size-4" strokeWidth={2.4} />}
        {t("submit")}
      </button>
    </form>
  );
}
