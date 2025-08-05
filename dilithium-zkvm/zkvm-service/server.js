const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const HOST_BINARY_PATH = '../target/release/host';

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'zkVM service running',
        endpoints: {
            'POST /generate-key': 'Generate Dilithium keys',
            'POST /verify': 'Generate zkVM proof for message'
        }
    });
});

async function runHostBinary(args) {
    return new Promise((resolve) => {
        const process = spawn(HOST_BINARY_PATH, args, {
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

app.post('/generate-key', async (req, res) => {
    console.log('📥 Received generate-key request');
    try {
        console.log('🔄 Running host binary...');
        const result = await runHostBinary(['generate-keypair']);
        
        if (!result.success) {
            throw new Error(result.stderr || 'Key generation failed');
        }
        
        const hashMatch = result.stdout.match(/Public key hash: ([a-fA-F0-9]+)/);
        const publicKeyHash = hashMatch ? hashMatch[1] : '';
        
        const publicKey = fs.readFileSync(path.join(__dirname, '../public_key.bin'));
        const privateKey = fs.readFileSync(path.join(__dirname, '../private_key.bin'));
        
        res.json({
            success: true,
            publicKey: publicKey.toString('hex'),
            privateKey: privateKey.toString('hex'),
            publicKeyHash
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

async function tryBoundlessProving(message, privateKey) {
    try {
        console.log('🌐 Trying Boundless proving via Rust service...');
        
        const boundlessResponse = await fetch('http://localhost:4001/prove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                privateKey: privateKey
            })
        });
        
        if (!boundlessResponse.ok) {
            throw new Error(`Boundless service error: ${boundlessResponse.status}`);
        }
        
        const boundlessResult = await boundlessResponse.json();
        
        if (!boundlessResult.success) {
            throw new Error(boundlessResult.error || 'Boundless proving failed');
        }
        
        return {
            success: true,
            proof: {
                journal: boundlessResult.proof.journal,
                seal: boundlessResult.proof.seal,
                isValid: boundlessResult.proof.is_valid,
                provider: 'boundless'
            }
        };
        
    } catch (error) {
        console.log('❌ Boundless proving failed:', error.message);
        return { success: false, error: error.message };
    }
}

app.post('/verify', async (req, res) => {
    console.log('📥 Received verify request');
    try {
        const { message } = req.body;
        console.log('🔄 Starting verification process...');
        
        if (!message) {
            throw new Error('Message is required');
        }
        
        // Try Boundless first
        let result = await tryBoundlessProving(message, req.body.privateKey);
        
        if (!result.success) {
            console.log('🔄 Boundless failed, trying local proving...');
            
            // Fallback to local proving
            const signResult = await runHostBinary([
                'sign',
                '--private-key', '../private_key.bin',
                '--message', message,
                '--output', '../signature.bin'
            ]);
            
            if (!signResult.success) {
                throw new Error('Signing failed: ' + signResult.stderr);
            }
            
            const verifyResult = await runHostBinary([
                'verify',
                '--public-key', '../public_key.bin',
                '--signature', '../signature.bin',
                '--message', message,
                '--output', '../receipt.bin'
            ]);
            
            if (!verifyResult.success) {
                throw new Error('Verification failed: ' + verifyResult.stderr);
            }
            
            const extractResult = await runHostBinary([
                'extract',
                '--receipt', '../receipt.bin',
                '--format', 'hex'
            ]);
            
            if (!extractResult.success) {
                throw new Error('Proof extraction failed: ' + extractResult.stderr);
            }
            
            const lines = extractResult.stdout.trim().split('\n');
            const journalLine = lines.find(l => l.startsWith('journal:'));
            const sealLine = lines.find(l => l.startsWith('seal:'));
            
            const journal = journalLine ? journalLine.split(': ')[1] : '';
            const seal = sealLine ? sealLine.split(': ')[1] : '';
            
            result = {
                success: true,
                proof: {
                    journal,
                    seal,
                    isValid: true,
                    provider: 'local'
                }
            };
        }
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`✅ zkVM service running on http://localhost:${PORT}`);
});