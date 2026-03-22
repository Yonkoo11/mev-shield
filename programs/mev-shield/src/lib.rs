use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::Side;

declare_id!("7uzK1zmV5ret2UVWpMRKHoVuLhcK4qQqzhGhg6AECNEj");

#[program]
pub mod mev_shield {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, batch_duration_secs: u32) -> Result<()> {
        instructions::initialize::handler(ctx, batch_duration_secs)
    }

    pub fn deposit(ctx: Context<Deposit>, amount_a: u64, amount_b: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount_a, amount_b)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount_a: u64, amount_b: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount_a, amount_b)
    }

    pub fn open_batch(ctx: Context<OpenBatch>) -> Result<()> {
        instructions::open_batch::handler(ctx)
    }

    pub fn submit_order(
        ctx: Context<SubmitOrder>,
        side: Side,
        limit_price: u64,
        amount: u64,
    ) -> Result<()> {
        instructions::submit_order::handler(ctx, side, limit_price, amount)
    }

    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        instructions::cancel_order::handler(ctx)
    }

    pub fn settle_batch<'info>(
        ctx: Context<'_, '_, 'info, 'info, SettleBatch<'info>>,
    ) -> Result<()> {
        instructions::settle_batch::handler(ctx)
    }
}
