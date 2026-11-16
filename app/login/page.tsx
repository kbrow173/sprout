import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Sprout } from "lucide-react";
import { getTranslations } from "next-intl/server";
import LoginForm from "@/components/LoginForm";
import { SESSION_COOKIE, isValidSession, passcodeConfigured, safeNextPath } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  // Gate off, or already unlocked → nothing to do here.
  if (!passcodeConfigured() || (await isValidSession((await cookies()).get(SESSION_COOKIE)?.value))) {
    redirect(next);
  }
  const t = await getTranslations("login");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="animate-pop mb-5 flex size-20 items-center justify-center rounded-full bg-sprout-100">
        <Sprout className="size-10 text-forest-700" strokeWidth={2} />
      </div>
      <h1 className="text-2xl font-bold text-forest-800">{t("title")}</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{t("body")}</p>
      <LoginForm next={next} />
    </main>
  );
}
