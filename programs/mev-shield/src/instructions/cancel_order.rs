use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::MevShieldError;

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(
        mut,
        seeds = [BATCH_SEED, batch.batch_id.to_le_bytes().as_ref()],
        bump = batch.bump,
    )]
    pub batch: Account<'info, Batch>,

    #[account(
        mut,
        close = user,
        seeds = [ORDER_SEED, order.batch_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = order.bump,
        has_one = user,
    )]
    pub order: Account<'info, Order>,

    #[account(
        mut,
        seeds = [BALANCE_SEED, user.key().as_ref()],
        bump = user_balance.bump,
        has_one = user,
    )]
    pub user_balance: Account<'info, UserBalance>,

    #[account(mut)]
    pub user: Signer<'info>,
}

pub fn handler(ctx: Context<CancelOrder>) -> Result<()> {
    require!(
        ctx.accounts.batch.status == BatchStatus::Open,
        MevShieldError::BatchNotOpen
    );
    require!(
        ctx.accounts.order.status == OrderStatus::Pending,
        MevShieldError::OrderNotFound
    );

    let order = &ctx.accounts.order;
    let user_balance = &mut ctx.accounts.user_balance;

    // Unlock funds
    match order.side {
        Side::Buy => {
            let lock_amount = (order.amount as u128)
                .checked_mul(order.limit_price as u128)
                .ok_or(MevShieldError::Overflow)?
                .checked_div(PRICE_SCALE as u128)
                .ok_or(MevShieldError::Overflow)? as u64;
            user_balance.token_b_locked = user_balance
                .token_b_locked
                .checked_sub(lock_amount)
                .ok_or(MevShieldError::Overflow)?;
        }
        Side::Sell => {
            user_balance.token_a_locked = user_balance
                .token_a_locked
                .checked_sub(order.amount)
                .ok_or(MevShieldError::Overflow)?;
        }
    }

    // Update batch
    let batch = &mut ctx.accounts.batch;
    batch.order_count = batch
        .order_count
        .checked_sub(1)
        .ok_or(MevShieldError::Overflow)?;
    match order.side {
        Side::Buy => {
            batch.total_buy_volume = batch
                .total_buy_volume
                .checked_sub(order.amount)
                .ok_or(MevShieldError::Overflow)?;
        }
        Side::Sell => {
            batch.total_sell_volume = batch
                .total_sell_volume
                .checked_sub(order.amount)
                .ok_or(MevShieldError::Overflow)?;
        }
    }

    Ok(())
}
