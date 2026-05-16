import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Peblo Notes",
  description: "AI-powered collaborative notes workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
