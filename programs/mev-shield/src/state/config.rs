use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub batch_duration_secs: u32,
    pub current_batch_id: u64,
    pub paused: bool,
    pub bump: u8,
}
