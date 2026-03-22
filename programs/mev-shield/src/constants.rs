/// Max orders per batch
pub const MAX_ORDERS_PER_BATCH: u16 = 20;

/// Price scale factor (1e6)
pub const PRICE_SCALE: u64 = 1_000_000;

/// Default batch duration in seconds
pub const DEFAULT_BATCH_DURATION: u32 = 30;

/// Seeds
pub const CONFIG_SEED: &[u8] = b"config";
pub const BATCH_SEED: &[u8] = b"batch";
pub const ORDER_SEED: &[u8] = b"order";
pub const BALANCE_SEED: &[u8] = b"balance";
pub const VAULT_A_SEED: &[u8] = b"vault_a";
pub const VAULT_B_SEED: &[u8] = b"vault_b";
