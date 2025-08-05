const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const HOST_BINARY_PATH = '../target/release/host';

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'zkVM service running (fast mode)',
        endpoints: {
            'POST /generate-key': 'Generate Dilithium keys',
            'POST /verify': 'Generate zkVM proof for message (fast mode)'
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
    try {
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

app.post('/verify', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            throw new Error('Message is required');
        }
        
        console.log(`🚀 Fast mode: Generating proof for message: ${message.slice(0, 16)}...`);
        
        // Fast mode: Generate mock proof without actual zkVM computation
        // In production, this would run the full RISC Zero proof generation
        
        // Create a deterministic "proof" based on the message
        const messageHash = crypto.createHash('sha256').update(message, 'hex').digest();
        const mockSeal = crypto.createHash('sha256').update(messageHash.toString('hex') + 'seal').digest();
        
        // The journal should contain the message hash (32 bytes)
        const journal = messageHash.toString('hex');
        const seal = mockSeal.toString('hex');
        
        console.log(`✅ Fast mode: Proof generated (journal: ${journal.slice(0, 16)}..., seal: ${seal.slice(0, 16)}...)`);
        
        res.json({
            success: true,
            proof: {
                journal,
                seal,
                isValid: true
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = 4001;
app.listen(PORT, () => {
    console.log(`✅ zkVM service (fast mode) running on http://localhost:${PORT}`);
});