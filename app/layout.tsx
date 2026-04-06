import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "@/app/globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { getFilterOptions } from "@/lib/shop";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "Laser Shop | Premium gravierte Gläser",
  description:
    "Moderne E-Commerce-Website für hochwertige, vorgravierte Gläser mit klarer Shop-Struktur."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const filterOptions = await getFilterOptions();

  return (
    <html lang="de" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body className="font-[var(--font-sans)] antialiased" suppressHydrationWarning>
        <Providers>
          <Header collections={filterOptions.collections} shopCategories={filterOptions.shopCategories} />
          <main>{children}</main>
          <Footer collections={filterOptions.collections} shopCategories={filterOptions.shopCategories} />
        </Providers>
      </body>
    </html>
  );
}

