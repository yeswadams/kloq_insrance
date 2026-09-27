import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Kloq | Fleet Underwriting",
  description: "Commercial fleet insurance underwriting workspace",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
