use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserBalance {
    pub user: Pubkey,
    /// SOL balance (token_a) in lamports
    pub token_a_balance: u64,
    /// USDC balance (token_b) in lamports
    pub token_b_balance: u64,
    /// Locked SOL (in open orders)
    pub token_a_locked: u64,
    /// Locked USDC (in open orders)
    pub token_b_locked: u64,
    pub bump: u8,
}
