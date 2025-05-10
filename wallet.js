#!/usr/bin/env node
// wallet.js ─ key‑generation CLI with PQ support

const fs = require("fs");
const path = require("path");
const { hideBin } = require("yargs/helpers");
const yargs = require("yargs/yargs")(hideBin(process.argv));

// ---- pull generators from qsafe‑signer ------------------
const {
  generateDilithiumKeyPair
} = require("./qsafe-signer/src");           // CommonJS bundle export

// ---- 1. parse args --------------------------------------
const argv = yargs
  .option("alg", {
    alias: "a",
    choices: ["ecdsa", "dilithium"],
    default: "ecdsa",
    describe: "Signature algorithm to generate"
  })
  .help()
  .argv;

// ---- 2. key‑generation ----------------------------------
let publicKey, privateKey, algorithm;

if (argv.alg === "dilithium") {
  ({ publicKey, secretKey: privateKey } = generateDilithiumKeyPair());
  algorithm = "dilithium5";
} else {
  // fallback: ECDSA secp256k1
  const { generateKeyPairSync } = require("crypto");
  const { publicKey: pub, privateKey: priv } = generateKeyPairSync("ec", {
    namedCurve: "secp256k1",
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" }
  });
  publicKey = pub;
  privateKey = priv;
  algorithm = "ecdsa-secp256k1";
}

// ---- 3. persist wallet ----------------------------------
const wallet = {
  algorithm,
  publicKey: Buffer.from(publicKey).toString("base64"),
  privateKey: Buffer.from(privateKey).toString("base64")
};

const outPath = path.resolve(__dirname, "wallet.json");
fs.writeFileSync(outPath, JSON.stringify(wallet, null, 2));
console.log(`✅  ${algorithm} keys written to wallet.json`);
