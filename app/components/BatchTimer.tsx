"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../lib/anchor";
import { getConfigPda, getBatchPda } from "../lib/pdas";
import BN from "bn.js";

interface BatchTimerProps {
  onBatchUpdate?: (batchId: number | null, status: string) => void;
}

export function BatchTimer({ onBatchUpdate }: BatchTimerProps) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [status, setStatus] = useState<string>("loading");

  const fetchBatch = useCallback(async () => {
    if (!wallet) return;
    try {
      const program = getProgram(connection, wallet);
      const configPda = getConfigPda();
      const config: any = await program.account.config.fetch(configPda);
      const currentId = (config.currentBatchId as BN).toNumber();

      if (currentId === 0) {
        setStatus("no_batch");
        onBatchUpdate?.(null, "no_batch");
        return;
      }

      // Try the latest batch (currentId - 1)
      const latestId = currentId - 1;
      const batchPda = getBatchPda(new BN(latestId));
      const batch: any = await program.account.batch.fetch(batchPda);

      setBatchId(latestId);
      setOrderCount(batch.orderCount);

      if (batch.status.open) {
        const now = Math.floor(Date.now() / 1000);
        const closeAt = (batch.closeAt as BN).toNumber();
        const remaining = Math.max(0, closeAt - now);
        setTimeLeft(remaining);
        setStatus("open");
        onBatchUpdate?.(latestId, "open");
      } else if (batch.status.settled) {
        setStatus("settled");
        setTimeLeft(0);
        onBatchUpdate?.(latestId, "settled");
      } else {
        setStatus("settling");
        setTimeLeft(0);
        onBatchUpdate?.(latestId, "settling");
      }
    } catch (e) {
      setStatus("no_batch");
      onBatchUpdate?.(null, "no_batch");
    }
  }, [connection, wallet, onBatchUpdate]);

  useEffect(() => {
    fetchBatch();
    const interval = setInterval(fetchBatch, 2000);
    return () => clearInterval(interval);
  }, [fetchBatch]);

  // Countdown ticker
  useEffect(() => {
    if (status !== "open" || timeLeft === null) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t !== null && t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, timeLeft]);

  const duration = 30;
  const progress = timeLeft !== null ? ((duration - timeLeft) / duration) * 100 : 0;
  const isUrgent = timeLeft !== null && timeLeft <= 5;

  return (
    <div className="bg-shield-card border border-shield-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-shield-muted">
          {batchId !== null ? `Batch #${batchId}` : "No Active Batch"}
        </h3>
        <span className="text-xs text-shield-muted">
          {orderCount}/20 orders
        </span>
      </div>

      {status === "open" && timeLeft !== null ? (
        <>
          <div className="w-full h-2 bg-shield-bg rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isUrgent ? "bg-shield-red" : "bg-shield-accent"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-shield-muted">
              {isUrgent ? "Closing soon!" : "Accepting orders"}
            </span>
            <span
              className={`text-2xl font-mono font-bold ${
                isUrgent ? "text-shield-red" : "text-shield-text"
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </>
      ) : status === "settled" ? (
        <div className="text-center py-2">
          <span className="text-shield-accent text-sm">Batch settled</span>
        </div>
      ) : status === "settling" ? (
        <div className="text-center py-2">
          <span className="text-shield-yellow text-sm animate-pulse">Computing clearing price...</span>
        </div>
      ) : (
        <div className="text-center py-2">
          <span className="text-shield-muted text-sm">Waiting for next batch...</span>
        </div>
      )}
    </div>
  );
}
