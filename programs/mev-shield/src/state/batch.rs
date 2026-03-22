use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum BatchStatus {
    Open,
    Settling,
    Settled,
}

#[account]
#[derive(InitSpace)]
pub struct Batch {
    pub batch_id: u64,
    pub status: BatchStatus,
    pub open_at: i64,
    pub close_at: i64,
    /// Clearing price: token_b per token_a, scaled by 1e6
    pub clearing_price: u64,
    pub total_buy_volume: u64,
    pub total_sell_volume: u64,
    pub order_count: u16,
    pub bump: u8,
}
