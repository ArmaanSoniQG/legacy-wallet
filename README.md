# Legacy Wallet (ECDSA baseline)
### Generate keys

```bash
# ECDSA (default)
node wallet.js
# Dilithium‑5 (post‑quantum)
node wallet.js --alg dilithium

| Test                       | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| **keygen → sign → verify** | “Happy path”—prove Dilithium works.            |
| **tampering**              | Make sure forged messages fail.                |
| **0-byte / 4 MB**          | Edge-cases: empty string and huge blob.        |
| **save ↔ load**            | File persistence didn’t corrupt keys.          |
| **wrong publicKey**        | Signature can’t be validated with another key. |


```
