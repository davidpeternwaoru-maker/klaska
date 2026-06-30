import type { Metadata } from "next";
import { Geist, Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

// Premium, modern type — Geist for UI text, Space Grotesk for display numerals.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Klaska — School OS",
  description: "The operating system for modern Nigerian private schools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", geist.variable, spaceGrotesk.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
