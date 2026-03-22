import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import BN from "bn.js";

const PROGRAM_ID = new PublicKey("7uzK1zmV5ret2UVWpMRKHoVuLhcK4qQqzhGhg6AECNEj");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet
  const walletPath = path.join(process.env.HOME || "", ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "../target/idl/mev_shield.json"), "utf8"));
  const program = new anchor.Program(idl, provider);

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Balance:", await connection.getBalance(wallet.publicKey) / 1e9, "SOL");

  // Create mints for token_a (wSOL) and token_b (mock USDC)
  console.log("\nCreating token mints...");
  const tokenAMint = await createMint(connection, walletKeypair, wallet.publicKey, null, 6);
  const tokenBMint = await createMint(connection, walletKeypair, wallet.publicKey, null, 6);
  console.log("Token A mint:", tokenAMint.toBase58());
  console.log("Token B mint:", tokenBMint.toBase58());

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const [vaultA] = PublicKey.findProgramAddressSync([Buffer.from("vault_a")], PROGRAM_ID);
  const [vaultB] = PublicKey.findProgramAddressSync([Buffer.from("vault_b")], PROGRAM_ID);

  // Initialize
  console.log("\nInitializing program...");
  const SYSVAR_RENT = new PublicKey("SysvarRent111111111111111111111111111111111");

  await program.methods
    .initialize(30) // 30 second batches
    .accounts({
      config: configPda,
      tokenAMint: tokenAMint,
      tokenBMint: tokenBMint,
      vaultA: vaultA,
      vaultB: vaultB,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT,
    })
    .rpc();

  console.log("Program initialized!");
  console.log("\nConfig PDA:", configPda.toBase58());
  console.log("Vault A:", vaultA.toBase58());
  console.log("Vault B:", vaultB.toBase58());

  // Save mint addresses for frontend
  const envContent = `NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_TOKEN_A_MINT=${tokenAMint.toBase58()}
NEXT_PUBLIC_TOKEN_B_MINT=${tokenBMint.toBase58()}
`;
  fs.writeFileSync(path.join(__dirname, "../app/.env.local"), envContent);
  console.log("\nSaved mint addresses to app/.env.local");

  // Create token accounts for the deployer and fund them
  console.log("\nCreating deployer token accounts...");
  const deployerTokenA = await createAccount(connection, walletKeypair, tokenAMint, wallet.publicKey);
  const deployerTokenB = await createAccount(connection, walletKeypair, tokenBMint, wallet.publicKey);

  await mintTo(connection, walletKeypair, tokenAMint, deployerTokenA, walletKeypair, 10000_000_000); // 10000 token A
  await mintTo(connection, walletKeypair, tokenBMint, deployerTokenB, walletKeypair, 1000000_000_000); // 1M token B

  console.log("Deployer Token A account:", deployerTokenA.toBase58(), "(funded 10000)");
  console.log("Deployer Token B account:", deployerTokenB.toBase58(), "(funded 1000000)");

  // Deposit for the deployer
  console.log("\nDepositing for deployer...");
  const [balancePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("balance"), wallet.publicKey.toBuffer()],
    PROGRAM_ID
  );

  await program.methods
    .deposit(new BN(5000_000_000), new BN(500000_000_000))
    .accounts({
      config: configPda,
      userBalance: balancePda,
      vaultA: vaultA,
      vaultB: vaultB,
      userTokenA: deployerTokenA,
      userTokenB: deployerTokenB,
      user: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Deposited 5000 Token A + 500000 Token B");

  // Open first batch
  console.log("\nOpening first batch...");
  const [batchPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("batch"), new BN(0).toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );

  await program.methods
    .openBatch()
    .accounts({
      config: configPda,
      batch: batchPda,
      crank: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Batch #0 opened!");
  console.log("\nSetup complete. Program ready on devnet.");
}

main().catch(console.error);
