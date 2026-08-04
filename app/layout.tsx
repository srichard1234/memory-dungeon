import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memory Dungeon",
  description: "A first-person memory maze game — collect the treasure, find the exit, in as few steps as possible.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col items-center justify-center">{children}</body>
    </html>
  );
}
