import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MevShield } from "../target/types/mev_shield";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { assert } from "chai";
import BN from "bn.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("mev-shield", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MevShield as Program<MevShield>;

  const authority = provider.wallet;
  const alice = Keypair.generate();
  const bob = Keypair.generate();

  let tokenAMint: PublicKey;
  let tokenBMint: PublicKey;
  let aliceTokenA: PublicKey;
  let aliceTokenB: PublicKey;
  let bobTokenA: PublicKey;
  let bobTokenB: PublicKey;

  let configPda: PublicKey;
  let vaultAPda: PublicKey;
  let vaultBPda: PublicKey;
  let aliceBalancePda: PublicKey;
  let bobBalancePda: PublicKey;

  const BATCH_DURATION = 2;
  const PRICE_SCALE = 1_000_000;

  before(async () => {
    const payer = (provider.wallet as anchor.Wallet).payer;

    // Airdrop to alice and bob
    for (const kp of [alice, bob]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    // Create mints (6 decimals each)
    tokenAMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );
    tokenBMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );

    // Create token accounts
    aliceTokenA = await createAccount(
      provider.connection,
      payer,
      tokenAMint,
      alice.publicKey
    );
    aliceTokenB = await createAccount(
      provider.connection,
      payer,
      tokenBMint,
      alice.publicKey
    );
    bobTokenA = await createAccount(
      provider.connection,
      payer,
      tokenAMint,
      bob.publicKey
    );
    bobTokenB = await createAccount(
      provider.connection,
      payer,
      tokenBMint,
      bob.publicKey
    );

    // Mint tokens: Alice gets 1000 token_a (SOL), Bob gets 100000 token_b (USDC)
    await mintTo(
      provider.connection,
      payer,
      tokenAMint,
      aliceTokenA,
      payer,
      1000_000_000
    );
    await mintTo(
      provider.connection,
      payer,
      tokenBMint,
      bobTokenB,
      payer,
      100000_000_000
    );

    // Derive PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    [vaultAPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_a")],
      program.programId
    );
    [vaultBPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_b")],
      program.programId
    );
    [aliceBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), alice.publicKey.toBuffer()],
      program.programId
    );
    [bobBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), bob.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes config and vaults", async () => {
    await program.methods
      .initialize(BATCH_DURATION)
      .accounts({
        config: configPda,
        tokenAMint: tokenAMint,
        tokenBMint: tokenBMint,
        vaultA: vaultAPda,
        vaultB: vaultBPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const config = await program.account.config.fetch(configPda);
    assert.equal(config.batchDurationSecs, BATCH_DURATION);
    assert.equal(config.currentBatchId.toNumber(), 0);
    assert.equal(config.paused, false);
  });

  it("Alice deposits 500 SOL-tokens", async () => {
    await program.methods
      .deposit(new BN(500_000_000), new BN(0))
      .accounts({
        config: configPda,
        userBalance: aliceBalancePda,
        vaultA: vaultAPda,
        vaultB: vaultBPda,
        userTokenA: aliceTokenA,
        userTokenB: aliceTokenB,
        user: alice.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([alice])
      .rpc();

    const bal = await program.account.userBalance.fetch(aliceBalancePda);
    assert.equal(bal.tokenABalance.toNumber(), 500_000_000);
  });

  it("Bob deposits 50000 USDC-tokens", async () => {
    await program.methods
      .deposit(new BN(0), new BN(50000_000_000))
      .accounts({
        config: configPda,
        userBalance: bobBalancePda,
        vaultA: vaultAPda,
        vaultB: vaultBPda,
        userTokenA: bobTokenA,
        userTokenB: bobTokenB,
        user: bob.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([bob])
      .rpc();

    const bal = await program.account.userBalance.fetch(bobBalancePda);
    assert.equal(bal.tokenBBalance.toNumber(), 50000_000_000);
  });

  let batchPda: PublicKey;
  const batchId = new BN(0);

  it("Opens batch 0", async () => {
    [batchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("batch"), batchId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .openBatch()
      .accounts({
        config: configPda,
        batch: batchPda,
        crank: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const batch = await program.account.batch.fetch(batchPda);
    assert.equal(batch.batchId.toNumber(), 0);
    assert.deepEqual(batch.status, { open: {} });
  });

  let aliceOrderPda: PublicKey;
  let bobOrderPda: PublicKey;

  it("Alice submits sell order: sell 100 SOL at 120 USDC/SOL", async () => {
    [aliceOrderPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        batchId.toArrayLike(Buffer, "le", 8),
        alice.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .submitOrder(
        { sell: {} },
        new BN(120 * PRICE_SCALE),
        new BN(100_000_000)
      )
      .accounts({
        config: configPda,
        batch: batchPda,
        order: aliceOrderPda,
        userBalance: aliceBalancePda,
        user: alice.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([alice])
      .rpc();

    const order = await program.account.order.fetch(aliceOrderPda);
    assert.deepEqual(order.side, { sell: {} });
    assert.equal(order.amount.toNumber(), 100_000_000);

    const bal = await program.account.userBalance.fetch(aliceBalancePda);
    assert.equal(bal.tokenALocked.toNumber(), 100_000_000);
  });

  it("Bob submits buy order: buy 100 SOL at 150 USDC/SOL", async () => {
    [bobOrderPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        batchId.toArrayLike(Buffer, "le", 8),
        bob.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .submitOrder(
        { buy: {} },
        new BN(150 * PRICE_SCALE),
        new BN(100_000_000)
      )
      .accounts({
        config: configPda,
        batch: batchPda,
        order: bobOrderPda,
        userBalance: bobBalancePda,
        user: bob.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([bob])
      .rpc();

    const order = await program.account.order.fetch(bobOrderPda);
    assert.deepEqual(order.side, { buy: {} });

    const bal = await program.account.userBalance.fetch(bobBalancePda);
    assert.equal(bal.tokenBLocked.toNumber(), 15_000_000_000);
  });

  it("Settles batch after expiry", async () => {
    console.log("    Waiting for batch to expire...");
    await sleep(3000);

    await program.methods
      .settleBatch()
      .accounts({
        config: configPda,
        batch: batchPda,
        crank: authority.publicKey,
      })
      .remainingAccounts([
        { pubkey: aliceOrderPda, isWritable: true, isSigner: false },
        { pubkey: aliceBalancePda, isWritable: true, isSigner: false },
        { pubkey: bobOrderPda, isWritable: true, isSigner: false },
        { pubkey: bobBalancePda, isWritable: true, isSigner: false },
      ])
      .rpc();

    const batch = await program.account.batch.fetch(batchPda);
    assert.deepEqual(batch.status, { settled: {} });

    // Clearing price = midpoint of 120 and 150 = 135 USDC/SOL
    const expectedClearingPrice = 135 * PRICE_SCALE;
    assert.equal(batch.clearingPrice.toNumber(), expectedClearingPrice);

    // Alice sold 100 SOL at 135: lost 100 SOL, gained 13500 USDC
    const aliceOrder = await program.account.order.fetch(aliceOrderPda);
    assert.deepEqual(aliceOrder.status, { filled: {} });
    assert.equal(aliceOrder.filledPrice.toNumber(), expectedClearingPrice);

    const aliceBal = await program.account.userBalance.fetch(aliceBalancePda);
    assert.equal(aliceBal.tokenABalance.toNumber(), 400_000_000);
    assert.equal(aliceBal.tokenBBalance.toNumber(), 13_500_000_000);
    assert.equal(aliceBal.tokenALocked.toNumber(), 0);

    // Bob bought 100 SOL at 135: gained 100 SOL, lost 13500 USDC
    const bobOrder = await program.account.order.fetch(bobOrderPda);
    assert.deepEqual(bobOrder.status, { filled: {} });

    const bobBal = await program.account.userBalance.fetch(bobBalancePda);
    assert.equal(bobBal.tokenABalance.toNumber(), 100_000_000);
    assert.equal(bobBal.tokenBBalance.toNumber(), 36_500_000_000);
    assert.equal(bobBal.tokenBLocked.toNumber(), 0);
  });

  it("Alice withdraws USDC proceeds", async () => {
    await program.methods
      .withdraw(new BN(0), new BN(13_500_000_000))
      .accounts({
        config: configPda,
        userBalance: aliceBalancePda,
        vaultA: vaultAPda,
        vaultB: vaultBPda,
        userTokenA: aliceTokenA,
        userTokenB: aliceTokenB,
        user: alice.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();

    const aliceTokenBAcct = await getAccount(provider.connection, aliceTokenB);
    assert.equal(Number(aliceTokenBAcct.amount), 13_500_000_000);

    const bal = await program.account.userBalance.fetch(aliceBalancePda);
    assert.equal(bal.tokenBBalance.toNumber(), 0);
  });

  it("Bob withdraws SOL proceeds", async () => {
    await program.methods
      .withdraw(new BN(100_000_000), new BN(0))
      .accounts({
        config: configPda,
        userBalance: bobBalancePda,
        vaultA: vaultAPda,
        vaultB: vaultBPda,
        userTokenA: bobTokenA,
        userTokenB: bobTokenB,
        user: bob.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bob])
      .rpc();

    const bobTokenAAcct = await getAccount(provider.connection, bobTokenA);
    assert.equal(Number(bobTokenAAcct.amount), 100_000_000);
  });
});
