import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sextou Viral Studio",
  description: "Sprint 1 foundation for the Sextou Viral Studio app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
