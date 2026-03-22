import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  PROGRAM_ID,
  CONFIG_SEED,
  BATCH_SEED,
  ORDER_SEED,
  BALANCE_SEED,
  VAULT_A_SEED,
  VAULT_B_SEED,
} from "./constants";

export function getConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID)[0];
}

export function getVaultAPda(): PublicKey {
  return PublicKey.findProgramAddressSync([VAULT_A_SEED], PROGRAM_ID)[0];
}

export function getVaultBPda(): PublicKey {
  return PublicKey.findProgramAddressSync([VAULT_B_SEED], PROGRAM_ID)[0];
}

export function getBatchPda(batchId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [BATCH_SEED, batchId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];
}

export function getOrderPda(batchId: BN, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [ORDER_SEED, batchId.toArrayLike(Buffer, "le", 8), user.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getBalancePda(user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [BALANCE_SEED, user.toBuffer()],
    PROGRAM_ID
  )[0];
}
