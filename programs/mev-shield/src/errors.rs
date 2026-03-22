use anchor_lang::prelude::*;

#[error_code]
pub enum MevShieldError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Program is paused")]
    Paused,
    #[msg("Batch is not open")]
    BatchNotOpen,
    #[msg("Batch is not ready for settlement")]
    BatchNotReady,
    #[msg("Batch already settled")]
    BatchAlreadySettled,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Too many orders in batch")]
    TooManyOrders,
    #[msg("Order not found")]
    OrderNotFound,
    #[msg("Batch not expired yet")]
    BatchNotExpired,
    #[msg("No orders to settle")]
    NoOrders,
    #[msg("Arithmetic overflow")]
    Overflow,
}
