import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AURUM — AI Finance Intelligence",
  description:
    "A luxury-grade financial analytics dashboard: live KPIs, expense composition, product economics, ML revenue forecasting, and an AI analyst powered by Claude.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="page-glow min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
