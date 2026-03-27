import type { Metadata } from "next";
import { Changa } from "next/font/google";
import "./globals.css";

const changa = Changa({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "SHPE Cornell Admin",
  description: "Admin dashboard for SHPE Cornell"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={changa.className}>{children}</body>
    </html>
  );
}
