import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("7uzK1zmV5ret2UVWpMRKHoVuLhcK4qQqzhGhg6AECNEj");
export const PRICE_SCALE = 1_000_000;
export const MAX_ORDERS_PER_BATCH = 20;

// PDA seeds
export const CONFIG_SEED = Buffer.from("config");
export const BATCH_SEED = Buffer.from("batch");
export const ORDER_SEED = Buffer.from("order");
export const BALANCE_SEED = Buffer.from("balance");
export const VAULT_A_SEED = Buffer.from("vault_a");
export const VAULT_B_SEED = Buffer.from("vault_b");
