# Progress

## 2026-03-22 - Wire frontend to on-chain Solana transactions

### What Changed (Plain English)
- The app's trading interface now talks to the real Solana program instead of showing fake data
- When you connect your wallet and there's an open batch on-chain, the timer shows real countdown and order count from the blockchain
- Submitting a buy/sell order actually sends a Solana transaction that lands on-chain
- The deposit panel lets you enter token account addresses and sends a real deposit transaction
- Your balance display reads your actual on-chain token balances (SOL and USDC held in the protocol)
- Settled batch results show real clearing prices, volumes, and order counts from the chain
- The order form is disabled when no batch is open, preventing wasted transactions

### Files Changed
- `hooks/useShieldProgram.ts` - NEW: shared hooks for program instance, config, user balance, and current batch data
- `components/OrderForm.tsx` - REWRITTEN: sends real `submit_order` transaction with proper PDA accounts
- `components/BatchTimer.tsx` - REWRITTEN: reads batch status from chain, shows real countdown
- `components/BatchResult.tsx` - REWRITTEN: fetches last 5 settled batches from chain
- `components/BalanceDisplay.tsx` - REWRITTEN: uses `useAnchorWallet` properly instead of raw wallet adapter
- `components/DepositPanel.tsx` - REWRITTEN: sends real `deposit` transaction, includes token account address inputs
- `app/page.tsx` - UPDATED: passes batch state between BatchTimer and OrderForm components

### Build Status
- `next build` compiles successfully with 0 errors
