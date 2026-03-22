"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

export function Header() {
  const { connected } = useWallet();

  return (
    <header className="flex items-center justify-between py-4 border-b border-shield-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-shield-accent/20 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-shield-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight">
          MEV<span className="text-shield-accent">Shield</span>
        </span>
        <span className="text-xs text-shield-muted bg-shield-card px-2 py-0.5 rounded">
          SOL/USDC
        </span>
      </div>
      {connected && <WalletMultiButton />}
    </header>
  );
}
