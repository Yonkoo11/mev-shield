import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mev-shield-dex.netlify.app";

export const metadata: Metadata = {
  title: "MEV Shield | Private Batch Auction DEX",
  description:
    "Zero-MEV trading on Solana. Encrypted orders via TEE-backed batch auctions with uniform clearing prices.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "MEV Shield — Trade without MEV",
    description:
      "Private batch auction DEX on Solana. Orders encrypted until settlement. No sandwich attacks. No frontrunning.",
    images: [
      {
        url: `${siteUrl}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: "MEV Shield - Private Batch Auction DEX on Solana",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MEV Shield — Trade without MEV",
    description:
      "Private batch auction DEX on Solana. Encrypted orders, uniform clearing price, atomic settlement.",
    images: [`${siteUrl}/og-image.svg`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-shield-bg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
