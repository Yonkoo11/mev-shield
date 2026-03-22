# Memory

## Architecture
- Next.js 14 app with Tailwind CSS, deployed as static pages
- Anchor program at `7uzK1zmV5ret2UVWpMRKHoVuLhcK4qQqzhGhg6AECNEj`
- IDL imported from `../../target/idl/mev_shield.json`
- RPC endpoint configured via `NEXT_PUBLIC_RPC_URL` env var (defaults to localhost:8899)
- PDA seeds: config, batch (+ u64 le), order (+ u64 le + pubkey), balance (+ pubkey), vault_a, vault_b
- Wallet adapters: Phantom + Solflare

## Key Decisions
- Use `useAnchorWallet` (not `wallet.adapter`) for Anchor provider -- the adapter type doesn't satisfy AnchorWallet
- BatchTimer owns the batch polling and passes batchId + status up to page via callback
- OrderForm receives batchId as prop, disabled when null (no open batch)
- Deposit panel includes expandable token account address fields for localnet/devnet use
- PRICE_SCALE = 1_000_000 for price conversion
- Token amounts scaled by 1e6 (SPL token decimals)
