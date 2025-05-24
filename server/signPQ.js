#!/usr/bin/env node
import express from 'express';
import cors     from 'cors';
import { ml_dsa65 }           from '@noble/post-quantum/ml-dsa';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const { secretKey } = ml_dsa65.keygen();         // demo in-memory keypair

app.post('/signPQ', (req, res) => {
  const { hash } = req.body;                     // expect 0x...
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash))
    return res.status(400).json({ error: 'bad hash' });

  const sig = ml_dsa65.sign(secretKey, hexToBytes(hash.slice(2)));
  res.json({ pqSig: '0x' + bytesToHex(sig) });
});

app.listen(4000, () => console.log('🔒  PQ signing API on :4000'));
