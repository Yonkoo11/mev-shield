"use client";

import { useState } from "react";
import { useWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { getProgram } from "../lib/anchor";
import { getConfigPda, getBatchPda, getOrderPda, getBalancePda } from "../lib/pdas";
import { PRICE_SCALE } from "../lib/constants";
import BN from "bn.js";

export function OrderForm({ batchId, onOrderSubmitted }: { batchId: number | null; onOrderSubmitted?: () => void }) {
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
    if (!publicKey || !wallet || !price || !amount || batchId === null) return;
    setLoading(true);
    setStatus("Encrypting order for TEE...");

    try {
      const program = getProgram(connection, wallet);
      const batchBN = new BN(batchId);
      const limitPrice = new BN(Math.floor(parseFloat(price) * PRICE_SCALE));
      const orderAmount = new BN(Math.floor(parseFloat(amount) * 1e6));

      const configPda = getConfigPda();
      const batchPda = getBatchPda(batchBN);
      const orderPda = getOrderPda(batchBN, publicKey);
      const balancePda = getBalancePda(publicKey);

      const sideArg = side === "buy" ? { buy: {} } : { sell: {} };

      await program.methods
        .submitOrder(sideArg, limitPrice, orderAmount)
        .accounts({
          config: configPda,
          batch: batchPda,
          order: orderPda,
          userBalance: balancePda,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus(`Order submitted to batch #${batchId}! Your order is encrypted inside the TEE.`);
      setPrice("");
      setAmount("");
      onOrderSubmitted?.();
    } catch (e: any) {
      console.error(e);
      setStatus("Error: " + (e.message || "Transaction failed"));
    }
    setLoading(false);
  };

  return (
    <div className="bg-shield-card border border-shield-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-shield-muted mb-4">
        Submit Order {batchId !== null ? `(Batch #${batchId})` : ""}
      </h3>

      {batchId === null ? (
        <p className="text-shield-muted text-sm">Waiting for an open batch...</p>
      ) : (
        <>
          {/* Side toggle */}
          <div className="flex gap-1 bg-shield-bg rounded-lg p-1 mb-4">
            <button
              onClick={() => setSide("buy")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-out ${
                side === "buy"
                  ? "bg-shield-accent/20 text-shield-accent"
                  : "text-shield-muted hover:text-shield-text"
              }`}
            >
              Buy SOL
            </button>
            <button
              onClick={() => setSide("sell")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-out ${
                side === "sell"
                  ? "bg-shield-red/20 text-shield-red"
                  : "text-shield-muted hover:text-shield-text"
              }`}
            >
              Sell SOL
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-shield-muted">
                Limit Price (USDC per SOL)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
                className="w-full mt-1 bg-shield-bg border border-shield-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-shield-accent"
              />
            </div>
            <div>
              <label className="text-xs text-shield-muted">Amount (SOL)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                className="w-full mt-1 bg-shield-bg border border-shield-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-shield-accent"
              />
            </div>

            {price && amount && (
              <div className="bg-shield-bg rounded-lg p-3 text-xs text-shield-muted">
                <div className="flex justify-between">
                  <span>Total {side === "buy" ? "cost" : "proceeds"}</span>
                  <span className="font-mono text-shield-text">
                    {(parseFloat(price) * parseFloat(amount)).toFixed(2)} USDC
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !price || !amount}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-colors duration-150 ease-out disabled:opacity-50 ${
                side === "buy"
                  ? "bg-shield-accent text-shield-bg hover:bg-shield-accent/90"
                  : "bg-shield-red text-white hover:bg-shield-red/90"
              }`}
            >
              {loading ? "Encrypting & Submitting..." : `${side === "buy" ? "Buy" : "Sell"} SOL`}
            </button>

            {status && (
              <div className="flex items-center gap-2 text-xs text-shield-accent mt-2">
                <div className="w-2 h-2 rounded-full bg-shield-accent" />
                {status}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
