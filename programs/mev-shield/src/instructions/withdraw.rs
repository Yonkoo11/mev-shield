use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Config, UserBalance};
use crate::constants::*;
use crate::errors::MevShieldError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [BALANCE_SEED, user.key().as_ref()],
        bump = user_balance.bump,
        has_one = user,
    )]
    pub user_balance: Account<'info, UserBalance>,

    #[account(
        mut,
        seeds = [VAULT_A_SEED],
        bump,
    )]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [VAULT_B_SEED],
        bump,
    )]
    pub vault_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Withdraw>, amount_a: u64, amount_b: u64) -> Result<()> {
    require!(amount_a > 0 || amount_b > 0, MevShieldError::InvalidAmount);

    let user_balance = &mut ctx.accounts.user_balance;

    // Check available (unlocked) balance
    let available_a = user_balance
        .token_a_balance
        .checked_sub(user_balance.token_a_locked)
        .ok_or(MevShieldError::Overflow)?;
    let available_b = user_balance
        .token_b_balance
        .checked_sub(user_balance.token_b_locked)
        .ok_or(MevShieldError::Overflow)?;

    require!(amount_a <= available_a, MevShieldError::InsufficientBalance);
    require!(amount_b <= available_b, MevShieldError::InsufficientBalance);

    let config_bump = ctx.accounts.config.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[CONFIG_SEED, &[config_bump]]];

    if amount_a > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_a.to_account_info(),
                    to: ctx.accounts.user_token_a.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            ),
            amount_a,
        )?;
        user_balance.token_a_balance = user_balance
            .token_a_balance
            .checked_sub(amount_a)
            .ok_or(MevShieldError::Overflow)?;
    }

    if amount_b > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_b.to_account_info(),
                    to: ctx.accounts.user_token_b.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            ),
            amount_b,
        )?;
        user_balance.token_b_balance = user_balance
            .token_b_balance
            .checked_sub(amount_b)
            .ok_or(MevShieldError::Overflow)?;
    }

    Ok(())
}
