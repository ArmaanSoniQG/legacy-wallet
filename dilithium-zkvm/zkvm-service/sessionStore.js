const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');
const FILE = path.join(DATA_DIR, 'session-status.json');

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { 
    await fs.access(FILE); 
  } catch { 
    await fs.writeFile(FILE, '{}'); 
  }
}

// Dual-track status: audit and anchor are independent
async function setStatus(root, rec) {
  await ensureFile();
  const raw = JSON.parse(await fs.readFile(FILE, 'utf8'));
  const prev = raw[root] || { 
    root, 
    epoch: Date.now(), 
    expiry: Date.now() + 24 * 60 * 60 * 1000,
    anchor_status: 'pending', 
    audit_status: 'pending',
    updatedAt: Date.now() 
  };
  const next = { ...prev, ...rec, updatedAt: Date.now() };
  raw[root] = next;
  await fs.writeFile(FILE, JSON.stringify(raw, null, 2));
  return next;
}

// Derive session state from dual tracks
function getSessionState(record) {
  if (!record) return 'UNKNOWN';
  
  if (record.audit_status === 'verified') return 'VERIFIED';
  if (record.audit_status === 'running' || record.audit_status === 'pending') return 'PENDING';
  if (record.audit_status === 'failed' && record.anchor_status === 'confirmed') return 'DEGRADED';
  if (record.audit_status === 'failed') return 'FAILED';
  
  return 'PENDING';
}

async function getStatus(root) {
  await ensureFile();
  const raw = JSON.parse(await fs.readFile(FILE, 'utf8'));
  const record = raw[root] || null;
  if (record) {
    record.session_state = getSessionState(record);
  }
  return record;
}

module.exports = { setStatus, getStatus, getSessionState };