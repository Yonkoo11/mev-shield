"use client";

import { useState } from "react";
import { useWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getProgram } from "../lib/anchor";
import { getConfigPda, getVaultAPda, getVaultBPda, getBalancePda } from "../lib/pdas";
import BN from "bn.js";

export function DepositPanel() {
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [tokenAAccount, setTokenAAccount] = useState("");
  const [tokenBAccount, setTokenBAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleDeposit = async () => {
    if (!publicKey || !wallet) return;
    if (!tokenAAccount && !tokenBAccount) {
      setStatus("Enter at least one token account address");
      return;
    }
    setLoading(true);
    setStatus("Depositing...");
    try {
      const program = getProgram(connection, wallet);
      const a = new BN(Math.floor(parseFloat(amountA || "0") * 1e6));
      const b = new BN(Math.floor(parseFloat(amountB || "0") * 1e6));

      const configPda = getConfigPda();
      const vaultA = getVaultAPda();
      const vaultB = getVaultBPda();
      const balancePda = getBalancePda(publicKey);

      await program.methods
        .deposit(a, b)
        .accounts({
          config: configPda,
          userBalance: balancePda,
          vaultA: vaultA,
          vaultB: vaultB,
          userTokenA: new PublicKey(tokenAAccount || PublicKey.default.toBase58()),
          userTokenB: new PublicKey(tokenBAccount || PublicKey.default.toBase58()),
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus("Deposit successful!");
      setAmountA("");
      setAmountB("");
    } catch (e: any) {
      console.error(e);
      setStatus("Error: " + (e.message || "Transaction failed"));
    }
    setLoading(false);
  };

  return (
    <div className="bg-shield-card border border-shield-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-shield-muted mb-4">
        Deposit Tokens
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-shield-muted">SOL Amount</label>
          <input
            type="number"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 bg-shield-bg border border-shield-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-shield-accent"
          />
        </div>
        <div>
          <label className="text-xs text-shield-muted">USDC Amount</label>
          <input
            type="number"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 bg-shield-bg border border-shield-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-shield-accent"
          />
        </div>
        <details className="text-xs text-shield-muted">
          <summary className="cursor-pointer hover:text-shield-text">Token account addresses (advanced)</summary>
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={tokenAAccount}
              onChange={(e) => setTokenAAccount(e.target.value)}
              placeholder="SOL token account pubkey"
              className="w-full bg-shield-bg border border-shield-border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-shield-accent"
            />
            <input
              type="text"
              value={tokenBAccount}
              onChange={(e) => setTokenBAccount(e.target.value)}
              placeholder="USDC token account pubkey"
              className="w-full bg-shield-bg border border-shield-border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-shield-accent"
            />
          </div>
        </details>
        <button
          onClick={handleDeposit}
          disabled={loading || (!amountA && !amountB)}
          className="w-full py-2.5 bg-shield-accent/10 text-shield-accent border border-shield-accent/30 rounded-lg text-sm font-medium hover:bg-shield-accent/20 transition-colors duration-150 ease-out disabled:opacity-50"
        >
          {loading ? "Processing..." : "Deposit"}
        </button>
        {status && (
          <p className="text-xs text-shield-muted mt-2">{status}</p>
        )}
      </div>
    </div>
  );
}
