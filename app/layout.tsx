import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "@/app/globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "Laser Shop | Premium gravierte Glaeser",
  description:
    "Moderne E-Commerce-Website fuer hochwertige, vorgravierte Glaeser mit klarer Shop-Struktur."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-[var(--font-sans)] antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

