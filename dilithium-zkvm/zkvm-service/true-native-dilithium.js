const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Portable host binary path
const HOST_BIN = process.env.HOST_BIN || path.resolve(__dirname, '../target/release/host');

// TRUE native Dilithium verification without any zkVM
async function trueNativeDilithiumVerify(publicKeyBytes, signatureBytes, message) {
    console.log('🔐 TRUE native Dilithium verification (NO zkVM)...');
    const startTime = Date.now();
    
    try {
        // Write temp files
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const pubKeyPath = path.join(tempDir, 'temp_pub.bin');
        const sigPath = path.join(tempDir, 'temp_sig.bin');
        
        fs.writeFileSync(pubKeyPath, Buffer.from(publicKeyBytes, 'hex'));
        fs.writeFileSync(sigPath, Buffer.from(signatureBytes, 'hex'));
        
        // Use the working verify-native command
        const result = await runHostBinary([
            'verify-native',
            '--public-key', pubKeyPath,
            '--signature', sigPath,
            '--message', message
        ]);
        
        const elapsed = Date.now() - startTime;
        
        // Clean up
        fs.unlinkSync(pubKeyPath);
        fs.unlinkSync(sigPath);
        
        console.log(`⚡ TRUE native verification completed in ${elapsed}ms`);
        
        if (result.success) {
            return { valid: true, timeMs: elapsed };
        } else {
            return { valid: false, timeMs: elapsed, error: result.stderr };
        }
        
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error('💥 Native verification failed:', error);
        return { valid: false, timeMs: elapsed, error: error.message };
    }
}

// Generate keys and sign WITHOUT zkVM
async function generateAndSignTrueNative(message) {
    console.log('🔑 TRUE native key generation + signing (NO zkVM)...');
    const startTime = Date.now();
    
    try {
        // Use the generate-keypair command (this is native-only)
        const keyResult = await runHostBinary(['generate-keypair']);
        if (!keyResult.success) {
            throw new Error('Key generation failed: ' + keyResult.stderr);
        }
        
        // Use the sign command (this is native-only)  
        const signResult = await runHostBinary([
            'sign',
            '--private-key', '../private_key.bin',
            '--message', message,
            '--output', '../signature.bin'
        ]);
        
        if (!signResult.success) {
            throw new Error('Native signing failed: ' + signResult.stderr);
        }
        
        const elapsed = Date.now() - startTime;
        console.log(`⚡ TRUE native operations completed in ${elapsed}ms`);
        
        // Read the generated files
        const publicKey = fs.readFileSync(path.join(__dirname, '../public_key.bin'));
        const signature = fs.readFileSync(path.join(__dirname, '../signature.bin'));
        
        // Do TRUE native verification (not zkVM)
        const verifyResult = await trueNativeDilithiumVerify(
            publicKey.toString('hex'),
            signature.toString('hex'), 
            message
        );
        
        if (!verifyResult.valid) {
            throw new Error('Native verification failed');
        }
        
        return {
            success: true,
            publicKey: publicKey.toString('hex'),
            signature: signature.toString('hex'),
            timeMs: elapsed,
            verified: true
        };
        
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error('💥 TRUE native operations failed:', error);
        return {
            success: false,
            error: error.message,
            timeMs: elapsed
        };
    }
}

async function runHostBinary(args) {
    return new Promise((resolve) => {
        const process = spawn(HOST_BIN, args, {
            cwd: path.dirname(__filename)
        });
        
        process.on('error', (err) => {
            console.error('Host binary spawn error:', err.message);
            resolve({
                success: false,
                stdout: '',
                stderr: `Spawn error: ${err.message}`,
                exitCode: -1
            });
        });
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            resolve({
                success: code === 0,
                stdout,
                stderr,
                exitCode: code
            });
        });
    });
}

module.exports = {
    trueNativeDilithiumVerify,
    generateAndSignTrueNative
};