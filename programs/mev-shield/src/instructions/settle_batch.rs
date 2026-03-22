use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::MevShieldError;

#[derive(Accounts)]
pub struct SettleBatch<'info> {
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

    pub crank: Signer<'info>,
    // remaining_accounts: pairs of (Order, UserBalance) accounts
}

struct OrderInfo {
    side: Side,
    limit_price: u64,
    amount: u64,
    #[allow(dead_code)]
    pair_index: usize,
}

fn find_clearing_price(buys: &[OrderInfo], sells: &[OrderInfo]) -> u64 {
    if buys.is_empty() || sells.is_empty() {
        return 0;
    }

    // Check if any crossing exists
    let best_buy = buys[0].limit_price;
    let best_sell = sells[0].limit_price;
    if best_buy < best_sell {
        return 0; // No crossing
    }

    // Walk through sorted buys (highest first) and sells (lowest first)
    // Find where cumulative volumes cross
    let mut cum_buy_vol: u64 = 0;
    let mut cum_sell_vol: u64 = 0;
    let mut buy_idx = 0;
    let mut sell_idx = 0;

    while buy_idx < buys.len() && sell_idx < sells.len() {
        if buys[buy_idx].limit_price < sells[sell_idx].limit_price {
            break; // No more crossing
        }

        cum_buy_vol = cum_buy_vol.saturating_add(buys[buy_idx].amount);
        cum_sell_vol = cum_sell_vol.saturating_add(sells[sell_idx].amount);

        if cum_buy_vol >= cum_sell_vol {
            sell_idx += 1;
        } else {
            buy_idx += 1;
        }
    }

    // Clearing price = midpoint of last crossing buy/sell
    let final_buy_price = buys[buy_idx.min(buys.len() - 1)].limit_price;
    let final_sell_price = sells[sell_idx.min(sells.len() - 1)].limit_price;

    if final_buy_price >= final_sell_price {
        (final_buy_price + final_sell_price) / 2
    } else {
        0
    }
}

fn unlock_order(order: &Order, balance: &mut UserBalance) -> Result<()> {
    match order.side {
        Side::Buy => {
            let lock_amount = (order.amount as u128)
                .checked_mul(order.limit_price as u128)
                .ok_or(MevShieldError::Overflow)?
                .checked_div(PRICE_SCALE as u128)
                .ok_or(MevShieldError::Overflow)? as u64;
            balance.token_b_locked = balance
                .token_b_locked
                .checked_sub(lock_amount)
                .ok_or(MevShieldError::Overflow)?;
        }
        Side::Sell => {
            balance.token_a_locked = balance
                .token_a_locked
                .checked_sub(order.amount)
                .ok_or(MevShieldError::Overflow)?;
        }
    }
    Ok(())
}

pub fn handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, SettleBatch<'info>>,
) -> Result<()> {
    let batch = &mut ctx.accounts.batch;
    let clock = Clock::get()?;

    require!(
        batch.status == BatchStatus::Open,
        MevShieldError::BatchNotOpen
    );
    require!(
        clock.unix_timestamp >= batch.close_at,
        MevShieldError::BatchNotExpired
    );
    require!(batch.order_count > 0, MevShieldError::NoOrders);

    batch.status = BatchStatus::Settling;

    // Parse remaining accounts: pairs of (order, user_balance)
    let remaining = &ctx.remaining_accounts;
    require!(remaining.len() % 2 == 0, MevShieldError::OrderNotFound);
    let pair_count = remaining.len() / 2;

    // Collect orders for price computation
    let mut buy_orders: Vec<OrderInfo> = Vec::new();
    let mut sell_orders: Vec<OrderInfo> = Vec::new();

    for i in 0..pair_count {
        let order_info = &remaining[i * 2];
        let order_data = order_info.try_borrow_data()?;
        // Skip 8-byte discriminator
        let order: Order = Order::try_from_slice(&order_data[8..])?;

        let info = OrderInfo {
            side: order.side,
            limit_price: order.limit_price,
            amount: order.amount,
            pair_index: i,
        };

        match order.side {
            Side::Buy => buy_orders.push(info),
            Side::Sell => sell_orders.push(info),
        }
    }

    // Sort: buys by price DESC, sells by price ASC
    buy_orders.sort_by(|a, b| b.limit_price.cmp(&a.limit_price));
    sell_orders.sort_by(|a, b| a.limit_price.cmp(&b.limit_price));

    // Find clearing price using supply-demand intersection
    let clearing_price = find_clearing_price(&buy_orders, &sell_orders);

    if clearing_price == 0 {
        // No crossing -- mark all orders unfilled
        for i in 0..pair_count {
            let order_info = &remaining[i * 2];
            let balance_info = &remaining[i * 2 + 1];

            let mut order_data = order_info.try_borrow_mut_data()?;
            let mut order: Order = Order::try_from_slice(&order_data[8..])?;

            let mut balance_data = balance_info.try_borrow_mut_data()?;
            let mut balance: UserBalance = UserBalance::try_from_slice(&balance_data[8..])?;

            // Unlock funds
            unlock_order(&order, &mut balance)?;
            order.status = OrderStatus::Unfilled;

            // Serialize back
            let order_bytes = order.try_to_vec()?;
            order_data[8..8 + order_bytes.len()].copy_from_slice(&order_bytes);

            let balance_bytes = balance.try_to_vec()?;
            balance_data[8..8 + balance_bytes.len()].copy_from_slice(&balance_bytes);
        }

        batch.clearing_price = 0;
        batch.status = BatchStatus::Settled;
        return Ok(());
    }

    batch.clearing_price = clearing_price;

    // Fill orders at clearing price
    for i in 0..pair_count {
        let order_info = &remaining[i * 2];
        let balance_info = &remaining[i * 2 + 1];

        let mut order_data = order_info.try_borrow_mut_data()?;
        let mut order: Order = Order::try_from_slice(&order_data[8..])?;

        let mut balance_data = balance_info.try_borrow_mut_data()?;
        let mut balance: UserBalance = UserBalance::try_from_slice(&balance_data[8..])?;

        let fills = match order.side {
            Side::Buy => order.limit_price >= clearing_price,
            Side::Sell => order.limit_price <= clearing_price,
        };

        if fills {
            // Fill at clearing price
            order.filled_amount = order.amount;
            order.filled_price = clearing_price;
            order.status = OrderStatus::Filled;

            match order.side {
                Side::Buy => {
                    // Unlock token_b locked at limit_price
                    let locked_at_limit = (order.amount as u128)
                        .checked_mul(order.limit_price as u128)
                        .ok_or(MevShieldError::Overflow)?
                        .checked_div(PRICE_SCALE as u128)
                        .ok_or(MevShieldError::Overflow)?
                        as u64;
                    balance.token_b_locked = balance
                        .token_b_locked
                        .checked_sub(locked_at_limit)
                        .ok_or(MevShieldError::Overflow)?;

                    // Deduct token_b at clearing price
                    let cost = (order.amount as u128)
                        .checked_mul(clearing_price as u128)
                        .ok_or(MevShieldError::Overflow)?
                        .checked_div(PRICE_SCALE as u128)
                        .ok_or(MevShieldError::Overflow)?
                        as u64;
                    balance.token_b_balance = balance
                        .token_b_balance
                        .checked_sub(cost)
                        .ok_or(MevShieldError::Overflow)?;

                    // Credit token_a
                    balance.token_a_balance = balance
                        .token_a_balance
                        .checked_add(order.amount)
                        .ok_or(MevShieldError::Overflow)?;
                }
                Side::Sell => {
                    // Unlock token_a
                    balance.token_a_locked = balance
                        .token_a_locked
                        .checked_sub(order.amount)
                        .ok_or(MevShieldError::Overflow)?;

                    // Deduct token_a
                    balance.token_a_balance = balance
                        .token_a_balance
                        .checked_sub(order.amount)
                        .ok_or(MevShieldError::Overflow)?;

                    // Credit token_b at clearing price
                    let proceeds = (order.amount as u128)
                        .checked_mul(clearing_price as u128)
                        .ok_or(MevShieldError::Overflow)?
                        .checked_div(PRICE_SCALE as u128)
                        .ok_or(MevShieldError::Overflow)?
                        as u64;
                    balance.token_b_balance = balance
                        .token_b_balance
                        .checked_add(proceeds)
                        .ok_or(MevShieldError::Overflow)?;
                }
            }
        } else {
            // Doesn't fill -- unlock funds
            unlock_order(&order, &mut balance)?;
            order.status = OrderStatus::Unfilled;
        }

        // Serialize back
        let order_bytes = order.try_to_vec()?;
        order_data[8..8 + order_bytes.len()].copy_from_slice(&order_bytes);

        let balance_bytes = balance.try_to_vec()?;
        balance_data[8..8 + balance_bytes.len()].copy_from_slice(&balance_bytes);
    }

    batch.status = BatchStatus::Settled;
    Ok(())
}
