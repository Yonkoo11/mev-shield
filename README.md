# MEV Shield

**Private Batch Auction DEX on Solana** - Zero MEV trading via Trusted Execution Environments

## The Problem

Solana users lose millions to MEV attacks (sandwich attacks, frontrunning). Every swap on a public AMM broadcasts your intent before execution, allowing searchers to extract value from your trades.

## The Solution

MEV Shield uses **Private Ephemeral Rollups (PERs)** to run batch auctions inside a Trusted Execution Environment (TEE):

1. Users submit encrypted limit orders to the TEE
2. Orders are invisible to validators, searchers, and other traders
3. Every 30 seconds, a batch closes and the program computes a **uniform clearing price**
4. All matching orders fill at the same price - no frontrunning possible
5. Results commit atomically to Solana L1

## How It Works

```
User A (Buy 100 SOL @ $150)  ─┐
User B (Sell 80 SOL @ $120)   ├─► TEE Batch Auction ─► Clearing Price: $135
User C (Buy 50 SOL @ $140)   ─┘                        All fills @ $135
```

**Key properties:**
- Orders are **private** until settlement (TEE guarantees)
- Uniform clearing price means **no one gets a better price than anyone else**
- Atomic settlement means **no partial execution risk**
- Post-settlement transparency for verifiability

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Frontend   │────►│   Private Ephemeral  │────►│  Solana L1  │
│  (Next.js)   │     │   Rollup (TEE)       │     │  Settlement │
└─────────────┘     │                      │     └─────────────┘
                    │  - Order submission  │
                    │  - Balance tracking  │
                    │  - Batch settlement  │
                    │  - Clearing price    │
                    └──────────────────────┘
```

## Program Instructions

| Instruction | Description |
|------------|-------------|
| `initialize` | Create config + token vaults |
| `deposit` | SPL transfer to vault, track balance |
| `withdraw` | SPL transfer from vault to user |
| `open_batch` | Create new batch with countdown |
| `submit_order` | Encrypted limit order (TEE only) |
| `cancel_order` | Cancel pending order, unlock funds |
| `settle_batch` | Compute clearing price, fill orders |

## Clearing Price Algorithm

1. Sort buy orders by price (highest first)
2. Sort sell orders by price (lowest first)
3. Find the intersection of supply and demand curves
4. Set clearing price at the midpoint of crossing orders
5. Fill all eligible orders at this single price

## Tech Stack

- **Smart Contract:** Anchor 0.32.1 (Rust)
- **TEE Runtime:** MagicBlock Private Ephemeral Rollups
- **Frontend:** Next.js 14 + Tailwind CSS
- **Settler:** TypeScript crank service

## Quick Start

```bash
# Build the program
cargo-build-sbf --manifest-path programs/mev-shield/Cargo.toml

# Run tests (9 passing)
solana-test-validator --reset --bpf-program 7uzK1zmV5ret2UVWpMRKHoVuLhcK4qQqzhGhg6AECNEj target/deploy/mev_shield.so &
ANCHOR_PROVIDER_URL=http://localhost:8899 ANCHOR_WALLET=~/.config/solana/id.json npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts

# Run frontend
cd app && npm install && npm run dev

# Run settler
cd settler && npm install && npm start
```

## Test Results

```
  mev-shield
    ✔ Initializes config and vaults
    ✔ Alice deposits 500 SOL-tokens
    ✔ Bob deposits 50000 USDC-tokens
    ✔ Opens batch 0
    ✔ Alice submits sell order: sell 100 SOL at 120 USDC/SOL
    ✔ Bob submits buy order: buy 100 SOL at 150 USDC/SOL
    ✔ Settles batch after expiry (clearing price verified at $135)
    ✔ Alice withdraws USDC proceeds
    ✔ Bob withdraws SOL proceeds

  9 passing
```

## Security Model

**What MEV Shield protects against:**
- Sandwich attacks (orders invisible pre-settlement)
- Frontrunning (uniform clearing price eliminates advantage)
- Price discrimination (everyone gets the same price)

**What it does NOT protect against:**
- TEE compromise (assumes Intel TDX integrity)
- Timing analysis of balance delegation on L1
- Oracle manipulation (external price feeds)

## Program ID

`7uzK1zmV5ret2UVWpMRKHoVuLhcK4qQqzhGhg6AECNEj`

## License

MIT

---

Built for Solana Blitz v2 Hackathon, March 2026
