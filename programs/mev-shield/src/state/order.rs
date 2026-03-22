use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Side {
    Buy,
    Sell,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderStatus {
    Pending,
    Filled,
    PartialFill,
    Unfilled,
}

#[account]
#[derive(InitSpace)]
pub struct Order {
    pub batch_id: u64,
    pub user: Pubkey,
    pub side: Side,
    /// Limit price: token_b per token_a, scaled by 1e6
    pub limit_price: u64,
    /// Amount in token_a lamports
    pub amount: u64,
    pub filled_amount: u64,
    pub filled_price: u64,
    pub status: OrderStatus,
    pub created_at: i64,
    pub bump: u8,
}
