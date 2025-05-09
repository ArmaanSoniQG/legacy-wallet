// add-sig.js
const { execSync } = require('child_process');
const fs           = require('fs');

// run the Dilithium demo and capture its output
const output = execSync('node ./qsafe-signer/signer.js', { encoding: 'utf8' });
fs.writeFileSync('dilithium.sig', output.trim());
console.log('✅ dilithium.sig created');
