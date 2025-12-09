#!/usr/bin/env node
// ws-rpc-proxy.cjs — WebSocket JSON-RPC proxy that spoofs web3_clientVersion
// Node 18+, requires `npm i ws`
const { WebSocketServer, WebSocket } = require('ws');
const PORT = process.env.WS_PORT || 9546;
const UPSTREAM = process.env.WS_UPSTREAM; // e.g. wss://sepolia.infura.io/ws/v3/<KEY>
const SPOOF_VERSION = process.env.SPOOF_VERSION || "Geth/v1.10.26-stable/linux-amd64/go1.20.3";
if (!UPSTREAM) { console.error("ERROR: set WS_UPSTREAM to your provider WSS endpoint."); process.exit(1); }
function isBatch(x){ return Array.isArray(x); }
function handleJson(wsUp, msgObj, client){
  if (msgObj && msgObj.jsonrpc === "2.0" && msgObj.method === "web3_clientVersion") {
    const reply = { jsonrpc:"2.0", id: msgObj.id ?? 1, result: SPOOF_VERSION };
    client.send(JSON.stringify(reply));
    console.log("WS spoof → web3_clientVersion");
    return;
  }
  wsUp.send(JSON.stringify(msgObj));
}
const wss = new WebSocketServer({ host:'127.0.0.1', port: PORT }, () => {
  console.log(`WS RPC proxy listening on ws://127.0.0.1:${PORT} -> ${UPSTREAM}`);
});
wss.on('connection', (client) => {
  const wsUp = new WebSocket(UPSTREAM);
  wsUp.on('open',   () => console.log('WS upstream connected'));
  wsUp.on('message',(d) => client.send(d));
  wsUp.on('close',  (c,r)=>{ try{client.close(c,r);}catch{} });
  wsUp.on('error',  (e)  => { console.log('WS upstream error', e?.message||e); try{client.close(1011,'upstream error');}catch{} });
  client.on('message',(d)=>{
    let m; try{ m = JSON.parse(d.toString()); } catch {}
    if (!m) return;
    if (isBatch(m)) {
      console.log('WS RPC →', JSON.stringify(m.map(x=>x&&x.method).filter(Boolean)));
      for (const item of m) handleJson(wsUp, item, client);
    } else {
      console.log('WS RPC →', JSON.stringify([m.method].filter(Boolean)));
      handleJson(wsUp, m, client);
    }
  });
  client.on('close', ()=>{ try{wsUp.close();}catch{} });
  client.on('error', (e)=>console.log('WS client error', e?.message||e));
});
