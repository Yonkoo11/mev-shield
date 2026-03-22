use anchor_lang::prelude::*;
use crate::state::{Batch, BatchStatus, Config};
use crate::constants::*;

#[derive(Accounts)]
pub struct OpenBatch<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = crank,
        space = 8 + Batch::INIT_SPACE,
        seeds = [BATCH_SEED, config.current_batch_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub batch: Account<'info, Batch>,

    #[account(mut)]
    pub crank: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<OpenBatch>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let batch = &mut ctx.accounts.batch;
    let clock = Clock::get()?;

    batch.batch_id = config.current_batch_id;
    batch.status = BatchStatus::Open;
    batch.open_at = clock.unix_timestamp;
    batch.close_at = clock.unix_timestamp + config.batch_duration_secs as i64;
    batch.clearing_price = 0;
    batch.total_buy_volume = 0;
    batch.total_sell_volume = 0;
    batch.order_count = 0;
    batch.bump = ctx.bumps.batch;

    config.current_batch_id = config.current_batch_id.checked_add(1).unwrap();

    Ok(())
}
