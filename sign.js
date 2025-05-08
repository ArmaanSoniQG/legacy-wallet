// sign.js  —  ECDSA signing demo (secp256k1)

const Wallet   = require("ethereumjs-wallet").default;
const ethUtil  = require("ethereumjs-util");

// generate a random wallet
const wallet   = Wallet.generate();

// message to sign
const message  = Buffer.from("Hello, quantum world!");
const msgHash  = ethUtil.keccak256(message);              // 32‑byte hash

// create signature { r, s, v }
const { r, s, v } = ethUtil.ecsign(msgHash, wallet.getPrivateKey());

// Encode to standard “0x…” RPC format
const signature = ethUtil.toRpcSig(v, r, s);

console.log("Address   :", wallet.getAddressString());
console.log("Signature :", signature);
