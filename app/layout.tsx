import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const figtreeHeading = Figtree({subsets:['latin'],variable:'--font-heading'});

const outfit = Outfit({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SplitFlow - Smart Expense Sharing & Debt Simplification",
  description: "Split expenses cleanly, balance debts, and simplify settlements effortlessly.",
};

const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('splitflow-ui-theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && systemDark) || (saved === 'system' && systemDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", outfit.variable, figtreeHeading.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider defaultTheme="system" storageKey="splitflow-ui-theme">
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
