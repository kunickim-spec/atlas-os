import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ATLAS OS · Natural Gas Terminal", description: "Terminal analityczny rynku Natural Gas." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl"><body>{children}</body></html>;
}
