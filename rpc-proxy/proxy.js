const express = require('express');
const fetch = require('node-fetch');

const UPSTREAM = process.env.UPSTREAM;
const PORT = process.env.PORT || 8545;

if (!UPSTREAM) {
  console.error('Set UPSTREAM env var to your real Sepolia RPC URL');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.post('/', async (req, res) => {
  try {
    const { method } = req.body || {};
    // Spoof ONLY web3_clientVersion so Boundless CLI stops complaining
    if (method === 'web3_clientVersion') {
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id ?? 1,
        result: 'Geth/v1.99.0-stub/linux-amd64/go1.21.0'
      });
    }
    // Forward all other methods to the real provider
    const r = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const out = await r.text();
    // Return provider response as-is
    res.type('application/json').send(out);
  } catch (e) {
    console.error(e);
    res.status(502).json({
      jsonrpc: '2.0',
      id: req.body?.id ?? 1,
      error: { code: -32000, message: String(e) }
    });
  }
});

app.listen(PORT, () => {
  console.log(`RPC proxy listening on http://127.0.0.1:${PORT} -> ${UPSTREAM}`);
});
