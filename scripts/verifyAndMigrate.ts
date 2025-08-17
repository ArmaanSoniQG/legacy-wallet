import { ethers } from "ethers";
// inputs from step 7:
const REQUEST_ID    = process.env.REQUEST_ID!;
const IMAGE_ID      = process.env.IMAGE_ID!;      // 0x...
const JOURNAL_HEX   = process.env.JOURNAL_HEX!;   // 0x...
const SEAL_HEX      = process.env.SEAL_HEX!;      // 0x...

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
  const wallet   = new ethers.Wallet(process.env.REQUESTOR_PRIVATE_KEY!, provider);

  // 1) Call the deployed RISC Zero verifier (universal verifier or your app's verifier)
  const verifier = new ethers.Contract(process.env.VERIFIER_ADDR!, [
    "function verify(bytes32 imageId, bytes journal, bytes seal) public returns (bool)"
  ], wallet);

  const ok = await verifier.verify(IMAGE_ID, JOURNAL_HEX, SEAL_HEX);
  if (!ok) throw new Error("Proof did not verify on-chain");

  // 2) After verify, call your migration contract to set the new PQ key from the journal.
  const migrator = new ethers.Contract(process.env.MIGRATOR_ADDR!, [
    "function migrate(bytes newKey) public"
  ], wallet);

  const tx = await migrator.migrate(JOURNAL_HEX /* parse to extract new key */);
  console.log("Migration tx:", tx.hash);
}
main();