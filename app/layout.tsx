import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CliniFlow Lite",
  description: "AI-assisted pre-review validation for clinical content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
