"use client";

import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../lib/anchor";
import { getConfigPda, getBatchPda, getBalancePda } from "../lib/pdas";
import BN from "bn.js";

export function useShieldProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { publicKey } = useWallet();

  const program = wallet ? getProgram(connection, wallet) : null;

  return { program, connection, wallet, publicKey };
}

export function useConfig() {
  const { program } = useShieldProgram();
  const [config, setConfig] = useState<any>(null);

  const fetchConfig = useCallback(async () => {
    if (!program) return;
    try {
      const pda = getConfigPda();
      const data = await program.account.config.fetch(pda);
      setConfig(data);
    } catch {
      setConfig(null);
    }
  }, [program]);

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, 5000);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  return { config, refetch: fetchConfig };
}

export function useUserBalance() {
  const { program, publicKey } = useShieldProgram();
  const [balance, setBalance] = useState<any>(null);

  const fetchBalance = useCallback(async () => {
    if (!program || !publicKey) return;
    try {
      const pda = getBalancePda(publicKey);
      const data = await program.account.userBalance.fetch(pda);
      setBalance(data);
    } catch {
      setBalance(null);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 3000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, refetch: fetchBalance };
}

export function useCurrentBatch() {
  const { program } = useShieldProgram();
  const { config } = useConfig();
  const [batch, setBatch] = useState<any>(null);
  const [batchPda, setBatchPda] = useState<PublicKey | null>(null);

  const fetchBatch = useCallback(async () => {
    if (!program || !config) return;
    const currentId = config.currentBatchId as BN;
    if (currentId.toNumber() === 0) {
      setBatch(null);
      return;
    }
    const batchId = new BN(currentId.toNumber() - 1);
    const pda = getBatchPda(batchId);
    try {
      const data = await program.account.batch.fetch(pda);
      setBatch(data);
      setBatchPda(pda);
    } catch {
      setBatch(null);
      setBatchPda(null);
    }
  }, [program, config]);

  useEffect(() => {
    fetchBatch();
    const interval = setInterval(fetchBatch, 2000);
    return () => clearInterval(interval);
  }, [fetchBatch]);

  return { batch, batchPda, refetch: fetchBatch };
}
