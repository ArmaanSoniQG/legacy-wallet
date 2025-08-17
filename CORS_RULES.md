# CORS RULES - NEVER REPEAT THESE MISTAKES

## ❌ COMMON CORS MISTAKES THAT CAUSE HOURS OF DEBUGGING

### 1. **HOST MISMATCH** (Most Common)
- **WRONG**: Frontend on `127.0.0.1:5174` calling `localhost:4000`
- **RIGHT**: Frontend on `127.0.0.1:5174` calling `127.0.0.1:4000`
- **RULE**: Origin host and API host MUST match exactly

### 2. **HARD-CODED ORIGINS**
- **WRONG**: `res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')`
- **RIGHT**: Echo the caller's origin if it's in allowlist
- **RULE**: Never hard-code origins, always echo caller's origin

### 3. **MULTIPLE CORS LAYERS**
- **WRONG**: Using both `cors()` middleware AND manual headers
- **RIGHT**: One CORS implementation only
- **RULE**: Single source of truth for CORS

### 4. **CACHED OLD SERVERS**
- **WRONG**: Assuming server restarted when port is still bound
- **RIGHT**: Kill exact PID and verify port is free
- **RULE**: Always verify server restart with `ss -ltnp | grep :PORT`

## ✅ WORKING CORS IMPLEMENTATION

```javascript
// ===== CORS: dev-safe, explicit, before routes =====
const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:5174', 'http://localhost:5174',
  'http://127.0.0.1:5173', 'http://localhost:5173'
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Visible trace so we know which origin the server is echoing
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Preflight from', origin, '→ ACAO:', res.getHeader('Access-Control-Allow-Origin'));
    return res.status(204).end();
  }

  next();
});
// ===== end CORS =====
```

## 🔧 DEBUGGING COMMANDS

```bash
# Test preflight CORS
curl -i -X OPTIONS http://127.0.0.1:4000/session \
  -H "Origin: http://127.0.0.1:5174" \
  -H "Access-Control-Request-Method: POST"

# Check what's on port
ss -ltnp | grep :4000

# Kill exact process
kill [PID]

# Verify no leftover CORS code
grep -n "Access-Control-Allow-Origin\|cors(" server.js
```

## 📝 COMMIT MESSAGE TEMPLATE
```
fix: CORS host mismatch - frontend 127.0.0.1:5174 → API 127.0.0.1:4000

- Changed frontend fetch from localhost:4000 to 127.0.0.1:4000
- Implemented echo-origin CORS middleware
- Added CORS debugging logs
- Documented CORS rules to prevent future issues

Fixes: Session creation "Failed to fetch" error
```