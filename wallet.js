#!/usr/bin/env node
// Day-7 demo  –  generate keys
//
//   $ node wallet.js gen                → ECDSA pair  ▸ wallet.json
//   $ node wallet.js gen --alg dilithium → Dilithium-5 pair ▸ wallet.json
//
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");
const yargs  = require("yargs");

const WALLET = path.join(__dirname, "wallet.json");

// ────────────── CLI ──────────────
yargs
  .command(
    "gen",
    "Generate a key-pair (ECDSA default, --alg dilithium for PQ)",
    y => y.option("alg", {
      choices : ["ecdsa", "dilithium"],
      default : "ecdsa"
    }),
    async ({ alg }) => {
      if (alg === "ecdsa") {
        // ---------- classical ----------
        const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
          namedCurve: "secp256k1",
          publicKeyEncoding : { type: "spki",  format: "pem"  },
          privateKeyEncoding: { type: "pkcs8", format: "pem"  },
        });
        fs.writeFileSync(WALLET,
          JSON.stringify({ alg, publicKey, privateKey }, null, 2));
        console.log("🔑  ECDSA keys written to wallet.json");
      } else {
        // ---------- post-quantum (Dilithium-5) ----------
        // NOTE: from v0.4+ you *must* import the sub-module;
        // there is **no .ready()** and **no async keygen()** anymore.
        const { ml_dsa87 } = require("@noble/post-quantum/ml-dsa");
        const kp = ml_dsa87.keygen();          // sync
        fs.writeFileSync(WALLET,
          JSON.stringify({
            alg,
            publicKey : Buffer.from(kp.publicKey).toString("base64"),
            privateKey: Buffer.from(kp.secretKey).toString("base64"),
          }, null, 2));
        console.log("🔑  Dilithium-5 keys written to wallet.json");
      }
    }
  )
  .demandCommand(1)
  .help()
  .argv;
