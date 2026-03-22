"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../lib/anchor";
import { getBatchPda, getConfigPda } from "../lib/pdas";
import { PRICE_SCALE } from "../lib/constants";
import BN from "bn.js";

interface SettledBatch {
  batchId: number;
  clearingPrice: number;
  orderCount: number;
  totalBuyVolume: number;
  totalSellVolume: number;
}

export function BatchResult() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [results, setResults] = useState<SettledBatch[]>([]);

  const fetchSettledBatches = useCallback(async () => {
    if (!wallet) return;
    try {
      const program = getProgram(connection, wallet);
      const configPda = getConfigPda();
      const config: any = await program.account.config.fetch(configPda);
      const currentId = (config.currentBatchId as BN).toNumber();

      const settled: SettledBatch[] = [];
      // Check last 5 batches
      for (let i = Math.max(0, currentId - 5); i < currentId; i++) {
        try {
          const batchPda = getBatchPda(new BN(i));
          const batch: any = await program.account.batch.fetch(batchPda);
          if (batch.status.settled) {
            settled.push({
              batchId: i,
              clearingPrice: (batch.clearingPrice as BN).toNumber() / PRICE_SCALE,
              orderCount: batch.orderCount,
              totalBuyVolume: (batch.totalBuyVolume as BN).toNumber() / 1e6,
              totalSellVolume: (batch.totalSellVolume as BN).toNumber() / 1e6,
            });
          }
        } catch {
          // batch doesn't exist
        }
      }
      setResults(settled.reverse());
    } catch {
      // no config
    }
  }, [connection, wallet]);

  useEffect(() => {
    fetchSettledBatches();
    const interval = setInterval(fetchSettledBatches, 5000);
    return () => clearInterval(interval);
  }, [fetchSettledBatches]);

  return (
    <div className="bg-shield-card border border-shield-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-shield-muted mb-4">
        Settled Batches
      </h3>
      <div className="space-y-3">
        {results.map((batch) => (
          <div
            key={batch.batchId}
            className="bg-shield-bg rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-shield-muted">
                Batch #{batch.batchId}
              </span>
              <span className="text-xs text-shield-muted">
                {batch.orderCount} orders
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-shield-muted">Clearing Price</span>
              <span className="text-lg font-mono font-bold text-shield-accent">
                {batch.clearingPrice > 0
                  ? `$${batch.clearingPrice.toFixed(2)}`
                  : "No cross"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-shield-muted">
              <span>Buy vol: {batch.totalBuyVolume.toFixed(2)}</span>
              <span>Sell vol: {batch.totalSellVolume.toFixed(2)}</span>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <p className="text-shield-muted text-sm text-center py-4">
            No settled batches yet
          </p>
        )}
      </div>
    </div>
  );
}
