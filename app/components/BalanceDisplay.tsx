"use client";

import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useCallback } from "react";
import { getBalancePda } from "../lib/pdas";
import { getProgram } from "../lib/anchor";
import BN from "bn.js";

export function BalanceDisplay() {
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<any>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !wallet) return;
    try {
      const program = getProgram(connection, wallet);
      const pda = getBalancePda(publicKey);
      const data = await program.account.userBalance.fetch(pda);
      setBalance(data);
    } catch {
      setBalance(null);
    }
  }, [publicKey, connection, wallet]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 3000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const fmt = (val: any) => {
    if (!val) return "0.00";
    const n = typeof val === "number" ? val : val.toNumber ? val.toNumber() : 0;
    return (n / 1e6).toFixed(2);
  };

  return (
    <div className="bg-shield-card border border-shield-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-shield-muted mb-4">
        Your Balance
      </h3>
      {balance ? (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-shield-muted text-sm">SOL (Token A)</span>
            <div className="text-right">
              <span className="text-lg font-mono">
                {fmt(balance.tokenABalance)}
              </span>
              {balance.tokenALocked && balance.tokenALocked.toNumber() > 0 && (
                <span className="text-xs text-shield-yellow ml-2">
                  ({fmt(balance.tokenALocked)} locked)
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-shield-muted text-sm">USDC (Token B)</span>
            <div className="text-right">
              <span className="text-lg font-mono">
                {fmt(balance.tokenBBalance)}
              </span>
              {balance.tokenBLocked && balance.tokenBLocked.toNumber() > 0 && (
                <span className="text-xs text-shield-yellow ml-2">
                  ({fmt(balance.tokenBLocked)} locked)
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-shield-muted text-sm">
          No balance found. Deposit tokens to start trading.
        </p>
      )}
    </div>
  );
}
