import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habits — Daily Tracker",
  description: "A minimal habit tracker. Build streaks, stay consistent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
