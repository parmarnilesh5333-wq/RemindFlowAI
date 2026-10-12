import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "RemindFlow AI — Intelligent Reminder & Messaging Platform",
  description:
    "AI-powered reminder and messaging campaign management platform for coaching centres, schools, clubs, and small businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#060913] text-slate-100 antialiased selection:bg-blue-500/30 selection:text-blue-100 font-sans min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
