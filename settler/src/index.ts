import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";

// Load IDL
const idl = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../target/idl/mev_shield.json"),
    "utf8"
  )
);

const PROGRAM_ID = new PublicKey("7uzK1zmV5ret2UVWpMRKHoVuLhcK4qQqzhGhg6AECNEj");
const RPC_URL = process.env.RPC_URL || "http://localhost:8899";
const BATCH_DURATION = 30; // seconds

// Load wallet from default Solana keypair
const walletPath = process.env.WALLET_PATH ||
  path.join(process.env.HOME || "", ".config/solana/id.json");
const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")))
);

const connection = new Connection(RPC_URL, "confirmed");
const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const program: any = new anchor.Program(idl, provider);

// PDA helpers
function getConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  )[0];
}

function getBatchPda(batchId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("batch"), batchId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];
}

function getOrderPda(batchId: BN, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("order"),
      batchId.toArrayLike(Buffer, "le", 8),
      user.toBuffer(),
    ],
    PROGRAM_ID
  )[0];
}

function getBalancePda(user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("balance"), user.toBuffer()],
    PROGRAM_ID
  )[0];
}

async function openBatch(): Promise<BN> {
  const configPda = getConfigPda();
  const config: any = await program.account.config.fetch(configPda);
  const batchId = config.currentBatchId as BN;
  const batchPda = getBatchPda(batchId);

  console.log(`Opening batch #${batchId.toString()}...`);

  await program.methods
    .openBatch()
    .accounts({
      config: configPda,
      batch: batchPda,
      crank: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`Batch #${batchId.toString()} opened`);
  return batchId;
}

async function settleBatch(batchId: BN): Promise<void> {
  const configPda = getConfigPda();
  const batchPda = getBatchPda(batchId);

  // Fetch batch to get order count
  const batch: any = await program.account.batch.fetch(batchPda);

  if (batch.orderCount === 0) {
    console.log(`Batch #${batchId.toString()} has no orders, skipping settlement`);
    return;
  }

  // Find all order accounts for this batch
  // We need to scan for Order accounts with matching batch_id
  const orderAccounts = await program.account.order.all([
    {
      memcmp: {
        offset: 8, // after discriminator
        bytes: anchor.utils.bytes.bs58.encode(
          batchId.toArrayLike(Buffer, "le", 8)
        ),
      },
    },
  ]);

  console.log(
    `Found ${orderAccounts.length} orders for batch #${batchId.toString()}`
  );

  // Build remaining accounts: pairs of (Order, UserBalance)
  const remainingAccounts: anchor.web3.AccountMeta[] = [];
  for (const orderAccount of orderAccounts) {
    const order = orderAccount.account as any;
    const userBalancePda = getBalancePda(order.user);
    remainingAccounts.push({
      pubkey: orderAccount.publicKey,
      isWritable: true,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: userBalancePda,
      isWritable: true,
      isSigner: false,
    });
  }

  console.log(`Settling batch #${batchId.toString()}...`);

  await program.methods
    .settleBatch()
    .accounts({
      config: configPda,
      batch: batchPda,
      crank: wallet.publicKey,
    })
    .remainingAccounts(remainingAccounts)
    .rpc();

  // Fetch settled batch for results
  const settledBatch: any = await program.account.batch.fetch(batchPda);
  const clearingPrice = settledBatch.clearingPrice.toNumber() / 1e6;
  console.log(
    `Batch #${batchId.toString()} settled! Clearing price: $${clearingPrice.toFixed(
      2
    )} | Orders: ${orderAccounts.length}`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("MEV Shield Settler starting...");
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Crank wallet: ${wallet.publicKey.toBase58()}`);

  // Check if config exists
  const configPda = getConfigPda();
  try {
    const config: any = await program.account.config.fetch(configPda);
    console.log(`Config found. Batch duration: ${config.batchDurationSecs}s`);
    console.log(`Current batch ID: ${config.currentBatchId.toString()}`);
  } catch {
    console.error("Config not found. Please initialize the program first.");
    process.exit(1);
  }

  // Main loop
  while (true) {
    try {
      // Open a new batch
      const batchId = await openBatch();
      const batchPda = getBatchPda(batchId);

      // Wait for batch duration + 1 second buffer
      const config: any = await program.account.config.fetch(configPda);
      const duration = config.batchDurationSecs;
      console.log(`Waiting ${duration}s for batch to close...`);
      await sleep((duration + 1) * 1000);

      // Settle the batch
      await settleBatch(batchId);

      console.log("---");
    } catch (e: any) {
      console.error("Error in settler loop:", e.message);
      await sleep(5000);
    }
  }
}

run().catch(console.error);
