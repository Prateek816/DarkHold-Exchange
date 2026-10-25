import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shell/Providers";
import { AppLayout } from "@/components/shell/AppLayout";

export const metadata: Metadata = {
  title: {
    default: "Darkhold Exchange | A simulated trading floor",
    template: "%s — Darkhold Exchange",
  },
  description:
    "A simulated exchange for festival passes and limited-run objects, with enforced resale caps, descending-price auctions and a transparent reserve-match-settle ledger.",
  applicationName: "Darkhold Exchange",
  other: {
    "theme-color": "#04040A",
  },
};

export const viewport: Viewport = {
  themeColor: "#04040A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-canvas font-sans text-text antialiased">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
