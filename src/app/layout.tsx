import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BorderFlow — Cross-border payouts, made visible",
  description: "A transparent cross-border payout tracking demo for the Blaaiz Buildathon.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
