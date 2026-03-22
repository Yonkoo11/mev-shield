use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::MevShieldError;

#[derive(Accounts)]
#[instruction(side: Side, limit_price: u64, amount: u64)]
pub struct SubmitOrder<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [BATCH_SEED, batch.batch_id.to_le_bytes().as_ref()],
        bump = batch.bump,
    )]
    pub batch: Account<'info, Batch>,

    #[account(
        init,
        payer = user,
        space = 8 + Order::INIT_SPACE,
        seeds = [ORDER_SEED, batch.batch_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump,
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
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitOrder>,
    side: Side,
    limit_price: u64,
    amount: u64,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, MevShieldError::Paused);
    require!(
        ctx.accounts.batch.status == BatchStatus::Open,
        MevShieldError::BatchNotOpen
    );
    require!(
        ctx.accounts.batch.order_count < MAX_ORDERS_PER_BATCH,
        MevShieldError::TooManyOrders
    );
    require!(amount > 0, MevShieldError::InvalidAmount);
    require!(limit_price > 0, MevShieldError::InvalidPrice);

    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp < ctx.accounts.batch.close_at,
        MevShieldError::BatchNotOpen
    );

    let user_balance = &mut ctx.accounts.user_balance;

    // Lock funds based on side
    match side {
        Side::Buy => {
            // Buying token_a with token_b. Lock token_b = amount * limit_price / PRICE_SCALE
            let lock_amount = (amount as u128)
                .checked_mul(limit_price as u128)
                .ok_or(MevShieldError::Overflow)?
                .checked_div(PRICE_SCALE as u128)
                .ok_or(MevShieldError::Overflow)? as u64;
            let available = user_balance
                .token_b_balance
                .checked_sub(user_balance.token_b_locked)
                .ok_or(MevShieldError::Overflow)?;
            require!(lock_amount <= available, MevShieldError::InsufficientBalance);
            user_balance.token_b_locked = user_balance
                .token_b_locked
                .checked_add(lock_amount)
                .ok_or(MevShieldError::Overflow)?;
        }
        Side::Sell => {
            // Selling token_a. Lock token_a = amount
            let available = user_balance
                .token_a_balance
                .checked_sub(user_balance.token_a_locked)
                .ok_or(MevShieldError::Overflow)?;
            require!(amount <= available, MevShieldError::InsufficientBalance);
            user_balance.token_a_locked = user_balance
                .token_a_locked
                .checked_add(amount)
                .ok_or(MevShieldError::Overflow)?;
        }
    }

    // Create order
    let order = &mut ctx.accounts.order;
    order.batch_id = ctx.accounts.batch.batch_id;
    order.user = ctx.accounts.user.key();
    order.side = side;
    order.limit_price = limit_price;
    order.amount = amount;
    order.filled_amount = 0;
    order.filled_price = 0;
    order.status = OrderStatus::Pending;
    order.created_at = clock.unix_timestamp;
    order.bump = ctx.bumps.order;

    // Update batch
    let batch = &mut ctx.accounts.batch;
    batch.order_count = batch
        .order_count
        .checked_add(1)
        .ok_or(MevShieldError::Overflow)?;
    match side {
        Side::Buy => {
            batch.total_buy_volume = batch
                .total_buy_volume
                .checked_add(amount)
                .ok_or(MevShieldError::Overflow)?;
        }
        Side::Sell => {
            batch.total_sell_volume = batch
                .total_sell_volume
                .checked_add(amount)
                .ok_or(MevShieldError::Overflow)?;
        }
    }

    Ok(())
}
