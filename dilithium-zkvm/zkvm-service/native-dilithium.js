const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runHostBinary(args) {
    return new Promise((resolve) => {
        const process = spawn('../target/release/host', args, {
            cwd: path.dirname(__filename)
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

async function nativeDilithiumVerify(message, publicKeyPath, signaturePath) {
    console.log('🔐 Native Dilithium verification (no zkVM)...');
    const startTime = Date.now();
    
    try {
        // Use the host binary to do native verification (without zkVM proving)
        const result = await runHostBinary([
            'verify',
            '--public-key', publicKeyPath,
            '--signature', signaturePath,
            '--message', message,
            '--output', '../receipt.bin'
        ]);
        
        const elapsed = Date.now() - startTime;
        console.log(`⚡ Native Dilithium verify completed in ${elapsed}ms`);
        
        if (result.success) {
            console.log('✅ Native Dilithium signature VALID');
            return { valid: true, timeMs: elapsed };
        } else {
            console.log('❌ Native Dilithium signature INVALID');
            return { valid: false, timeMs: elapsed, error: result.stderr };
        }
        
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error('💥 Native verification failed:', error);
        return { valid: false, timeMs: elapsed, error: error.message };
    }
}

async function generateAndSignNative(message) {
    console.log('🔑 Generating keys and signing natively...');
    const startTime = Date.now();
    
    try {
        // Generate keypair
        const keyResult = await runHostBinary(['generate-keypair']);
        if (!keyResult.success) {
            throw new Error('Key generation failed: ' + keyResult.stderr);
        }
        
        // Sign message natively (no zkVM)
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
        console.log(`⚡ Native key generation + signing completed in ${elapsed}ms`);
        
        // Read the generated files
        const publicKey = fs.readFileSync(path.join(__dirname, '../public_key.bin'));
        const signature = fs.readFileSync(path.join(__dirname, '../signature.bin'));
        
        return {
            success: true,
            publicKey: publicKey.toString('hex'),
            signature: signature.toString('hex'),
            timeMs: elapsed
        };
        
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error('💥 Native generation/signing failed:', error);
        return {
            success: false,
            error: error.message,
            timeMs: elapsed
        };
    }
}

module.exports = {
    nativeDilithiumVerify,
    generateAndSignNative
};