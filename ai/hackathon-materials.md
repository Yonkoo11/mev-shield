# MEV Shield - Hackathon Materials

## Quick Reference

| Field | Value |
|-------|-------|
| Project name | MEV Shield |
| GitHub | https://github.com/Yonkoo11/mev-shield |
| Live demo | https://mev-shield-dex.netlify.app |
| Program ID | 7uzK1zmV5ret2UVWpMRKHoVuLhcK4qQqzhGhg6AECNEj |
| Network | Solana Devnet |
| Track | MagicBlock (Private Ephemeral Rollups) |

---

## One-line description (< 100 chars)

Private batch auction DEX on Solana that eliminates MEV via TEE-encrypted orders

---

## Long description

MEV Shield is a private batch auction DEX on Solana that eliminates sandwich attacks and frontrunning. Users submit encrypted limit orders into a Trusted Execution Environment powered by MagicBlock's Private Ephemeral Rollups. Orders are invisible to validators, searchers, and other traders until settlement.

Every 30 seconds, a batch closes and the on-chain program computes a uniform clearing price. All matching orders fill at the same price, so no one can get a better deal by seeing others' orders first. Results commit atomically to Solana L1, giving full post-settlement transparency while maintaining pre-trade privacy.

The Anchor program implements 7 instructions with a clearing price algorithm that sorts buy orders descending and sell orders ascending, finds the supply-demand crossing point, and fills at the midpoint. All 9 integration tests pass, covering the complete lifecycle: initialize, deposit, open batch, submit buy/sell orders, settle batch (verifying clearing price at $135), and withdraw proceeds.

---

## Tech Stack

- Anchor 0.32.1 (Rust) - on-chain program
- MagicBlock Private Ephemeral Rollups - TEE runtime (design target)
- Next.js 14 + Tailwind CSS - frontend
- TypeScript settler/crank service
- Solana Devnet - deployment

---

## Tweet Draft

Just shipped MEV Shield at @solana Blitz v2

A private batch auction DEX that kills sandwich attacks:

- Orders encrypted in a TEE until settlement
- Uniform clearing price -- everyone gets the same price
- Atomic settlement to Solana L1

No one sees your order. No one frontruns you.

Built on @magicblock Private Ephemeral Rollups.

9 tests passing. Deployed to devnet.

GitHub: https://github.com/Yonkoo11/mev-shield
Demo: https://mev-shield-dex.netlify.app

#SolanaBlitz #MEV #DeFi

---

## LinkedIn Draft

Shipped MEV Shield at Solana Blitz v2 -- a private batch auction DEX that eliminates MEV attacks on Solana.

The problem: Solana users lose millions to sandwich attacks. Every swap broadcasts your intent before execution, letting searchers extract value from your trades.

The solution: Users submit encrypted limit orders into a Trusted Execution Environment (MagicBlock's Private Ephemeral Rollups). Orders are invisible until a batch closes every 30 seconds. The program computes a uniform clearing price -- all matching orders fill at the same price. No frontrunning possible.

Technical highlights:
- Anchor program with 7 instructions and uniform clearing price algorithm
- 9 integration tests passing on local validator
- Deployed to Solana devnet
- Next.js frontend wired to real on-chain transactions
- TypeScript crank/settler service

This is the first batch auction DEX on Solana. Built in a weekend.

GitHub: https://github.com/Yonkoo11/mev-shield
Live: https://mev-shield-dex.netlify.app

#Solana #DeFi #MEV #Hackathon
