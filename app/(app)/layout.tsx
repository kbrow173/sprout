import BottomNav from "@/components/BottomNav";

/**
 * Shared frame for all in-app screens: a mobile-first centered column with
 * room at the bottom for the floating nav. Screens supply their own headers.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-5 pt-6 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
