use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Config, UserBalance};
use crate::constants::*;
use crate::errors::MevShieldError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserBalance::INIT_SPACE,
        seeds = [BALANCE_SEED, user.key().as_ref()],
        bump,
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

    /// User's token_a (SOL wrapped) account
    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,

    /// User's token_b (USDC) account
    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, amount_a: u64, amount_b: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, MevShieldError::Paused);
    require!(amount_a > 0 || amount_b > 0, MevShieldError::InvalidAmount);

    let user_balance = &mut ctx.accounts.user_balance;

    // Initialize if new
    if user_balance.user == Pubkey::default() {
        user_balance.user = ctx.accounts.user.key();
        user_balance.bump = ctx.bumps.user_balance;
    }

    // Transfer token_a
    if amount_a > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_a.to_account_info(),
                    to: ctx.accounts.vault_a.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_a,
        )?;
        user_balance.token_a_balance = user_balance
            .token_a_balance
            .checked_add(amount_a)
            .ok_or(MevShieldError::Overflow)?;
    }

    // Transfer token_b
    if amount_b > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_b.to_account_info(),
                    to: ctx.accounts.vault_b.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_b,
        )?;
        user_balance.token_b_balance = user_balance
            .token_b_balance
            .checked_add(amount_b)
            .ok_or(MevShieldError::Overflow)?;
    }

    Ok(())
}
