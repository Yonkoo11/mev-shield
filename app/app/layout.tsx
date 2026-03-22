import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MEV Shield | Private Batch Auction DEX",
  description: "Zero-MEV trading on Solana via private batch auctions",
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
