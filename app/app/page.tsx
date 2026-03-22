"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Header } from "../components/Header";
import { DepositPanel } from "../components/DepositPanel";
import { OrderForm } from "../components/OrderForm";
import { BatchTimer } from "../components/BatchTimer";
import { BatchResult } from "../components/BatchResult";
import { BalanceDisplay } from "../components/BalanceDisplay";
import { PrivacyBadge } from "../components/PrivacyBadge";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Encrypted Orders",
    desc: "Orders submitted inside a TEE. Invisible to validators and searchers.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Uniform Clearing Price",
    desc: "All orders in a batch fill at the same price. No frontrunning possible.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Atomic Settlement",
    desc: "Batch results commit atomically to Solana L1. No partial fills.",
  },
];

const stats = [
  { label: "Batch Interval", value: "30s" },
  { label: "Max Orders", value: "20" },
  { label: "Trading Pair", value: "SOL/USDC" },
  { label: "MEV Extracted", value: "$0" },
];

export default function Home() {
  const { connected } = useWallet();
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
  const [batchStatus, setBatchStatus] = useState<string>("loading");

  const handleBatchUpdate = (batchId: number | null, status: string) => {
    setActiveBatchId(batchId);
    setBatchStatus(status);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <Header />

      {!connected ? (
        <div className="flex flex-col items-center justify-center mt-16 gap-12">
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-bold tracking-tight">
              Trade without{" "}
              <span className="text-shield-accent">MEV</span>
            </h1>
            <p className="text-shield-muted text-lg max-w-lg mx-auto leading-relaxed">
              Private batch auctions on Solana. Your orders are encrypted until
              settlement. No sandwich attacks. No frontrunning.
            </p>
          </div>

          <WalletMultiButton />

          {/* How it works */}
          <div className="w-full max-w-3xl">
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="h-px flex-1 bg-shield-border" />
              <span className="text-xs text-shield-muted uppercase tracking-widest">How it works</span>
              <div className="h-px flex-1 bg-shield-border" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="bg-shield-card border border-shield-border rounded-xl p-5 hover:border-shield-accent/30 transition-colors"
                >
                  <div className="text-shield-accent mb-3">{f.icon}</div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-shield-muted leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-shield-accent">{s.value}</div>
                <div className="text-xs text-shield-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <PrivacyBadge />

          {/* Flow diagram */}
          <div className="w-full max-w-3xl bg-shield-card border border-shield-border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4 text-center">Batch Auction Flow</h3>
            <div className="grid grid-cols-5 gap-2 md:gap-4 text-xs">
              {[
                { n: "1", label: "Deposit" },
                { n: "2", label: "Submit Order" },
                { n: "3", label: "Batch Closes" },
                { n: "4", label: "Clearing Price" },
                { n: "5", label: "Settlement" },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-shield-accent/20 flex items-center justify-center text-shield-accent font-bold text-sm">
                    {step.n}
                  </div>
                  <span className="text-shield-muted text-center text-[10px] md:text-xs leading-tight">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="space-y-6">
            <BalanceDisplay />
            <DepositPanel />
          </div>

          <div className="space-y-6">
            <BatchTimer onBatchUpdate={handleBatchUpdate} />
            <OrderForm
              batchId={batchStatus === "open" ? activeBatchId : null}
            />
          </div>

          <div className="space-y-6">
            <BatchResult />
            <PrivacyBadge />
          </div>
        </div>
      )}
    </main>
  );
}
