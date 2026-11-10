import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "KrishiSatya — Satellite-Verified Farm Intelligence Platform",
  description:
    "AI-powered farm claim verification, FPO dashboard, and organic produce traceability using Google Agricultural Understanding API (ALU & AMED).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full">
        <Suspense fallback={null}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
