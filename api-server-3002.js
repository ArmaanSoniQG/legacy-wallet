const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BINARY_PATH = './dilithium-zkvm/target/release/host';

// Generate Dilithium key pair
app.post('/api/generate-keypair', (req, res) => {
    const process = spawn(BINARY_PATH, ['generate-keypair']);
    
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
        error += data.toString();
    });
    
    process.on('close', (code) => {
        if (code === 0) {
            try {
                const publicKey = fs.readFileSync('public_key.bin');
                const privateKey = fs.readFileSync('private_key.bin');
                
                // Calculate hash
                const crypto = require('crypto');
                const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
                
                res.json({
                    success: true,
                    publicKeyHash: hash,
                    output: output
                });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        } else {
            res.json({ success: false, error: error || 'Process failed' });
        }
    });
});

// Sign message
app.post('/api/sign', (req, res) => {
    const { message } = req.body;
    
    const process = spawn(BINARY_PATH, [
        'sign',
        '--private-key', 'private_key.bin',
        '--message', message,
        '--output', 'signature.bin'
    ]);
    
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
        error += data.toString();
    });
    
    process.on('close', (code) => {
        if (code === 0) {
            try {
                const signature = fs.readFileSync('signature.bin');
                res.json({
                    success: true,
                    signature: signature.toString('hex'),
                    output: output
                });
            } catch (err) {
                res.json({ success: false, error: err.message });
            }
        } else {
            res.json({ success: false, error: error || 'Process failed' });
        }
    });
});

// Verify signature and generate ZK proof
app.post('/api/verify', (req, res) => {
    const { message } = req.body;
    
    const process = spawn(BINARY_PATH, [
        'verify',
        '--public-key', 'public_key.bin',
        '--signature', 'signature.bin',
        '--message', message,
        '--output', 'receipt.bin'
    ]);
    
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
        error += data.toString();
    });
    
    process.on('close', (code) => {
        if (code === 0) {
            // Extract verification data
            const extractProcess = spawn(BINARY_PATH, [
                'extract',
                '--receipt', 'receipt.bin',
                '--format', 'hex'
            ]);
            
            let extractOutput = '';
            
            extractProcess.stdout.on('data', (data) => {
                extractOutput += data.toString();
            });
            
            extractProcess.on('close', (extractCode) => {
                if (extractCode === 0) {
                    const lines = extractOutput.trim().split('\n');
                    const journal = lines.find(l => l.startsWith('journal:')).split(': ')[1];
                    const seal = lines.find(l => l.startsWith('seal:')).split(': ')[1];
                    
                    res.json({
                        success: true,
                        proof: {
                            journal: journal,
                            seal: seal,
                            isValid: true
                        },
                        output: output
                    });
                } else {
                    res.json({ success: false, error: 'Failed to extract proof data' });
                }
            });
        } else {
            res.json({ success: false, error: error || 'Verification failed' });
        }
    });
});

app.listen(3002, () => {
    console.log('API server running on port 3002');
});