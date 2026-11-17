import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

// Distinctive, friendly type — deliberately NOT Inter/Roboto/system defaults.
// Self-hosted from @fontsource-variable (npm), NOT next/font/google: Google
// font fetching made Turbopack builds fail intermittently on CI and Vercel
// ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'") — L34.
// Variable fonts: one file covers every weight we use.
const display = localFont({
  src: "../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-display",
  weight: "200 800",
  display: "swap",
});

const body = localFont({
  src: "../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
  variable: "--font-body",
  weight: "200 1000",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sprout — your indoor garden",
  description:
    "Snap a photo, meet your plant, and never forget to water it again.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sprout",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f5b39",
  width: "device-width",
  initialScale: 1,

  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <ServiceWorkerRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
