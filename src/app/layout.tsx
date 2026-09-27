import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "IT Service Desk & Asset Management",
    template: "%s · IT Service Desk",
  },
  description:
    "Enterprise IT Service Desk, Asset Management, SLA, Inventory & Knowledge platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
