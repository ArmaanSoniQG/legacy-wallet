const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Temporary directory for processing files
const TEMP_DIR = path.join(__dirname, 'temp');
fs.ensureDirSync(TEMP_DIR);

// Path to the RISC Zero host binary
const HOST_BINARY = path.join(__dirname, '../target/release/host');

/**
 * Root route - simple welcome page
 */
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>RISC Zero Dilithium zkVM Service</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                    h1 { color: #333; }
                    .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 5px; }
                    code { background: #eee; padding: 2px 5px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <h1>RISC Zero Dilithium zkVM Service</h1>
                <p>This service provides APIs for Dilithium-5 signature verification using RISC Zero zkVM.</p>
                
                <h2>Available Endpoints:</h2>
                
                <div class="endpoint">
                    <h3>GET /health</h3>
                    <p>Health check endpoint</p>
                    <p>Example: <code>curl http://localhost:${PORT}/health</code></p>
                </div>
                
                <div class="endpoint">
                    <h3>POST /verify</h3>
                    <p>Generate ZK proof for Dilithium signature verification</p>
                    <p>Body: <code>{ publicKey: string, signature: string, message: string }</code></p>
                </div>
                
                <div class="endpoint">
                    <h3>POST /calldata</h3>
                    <p>Generate calldata for smart contract</p>
                    <p>Body: <code>{ journal: string, seal: string }</code></p>
                </div>
            </body>
        </html>
    `);
});

/**
 * Generate ZK proof for Dilithium signature verification
 * POST /verify
 * Body: { publicKey: string, signature: string, message: string }
 * Returns: { success: boolean, proof: { journal: string, seal: string }, error?: string }
 */
app.post('/verify', async (req, res) => {
    const { publicKey, signature, message } = req.body;
    
    if (!publicKey || !signature || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields: publicKey, signature, message' 
        });
    }
    
    const sessionId = uuidv4();
    const sessionDir = path.join(TEMP_DIR, sessionId);
    
    try {
        // Create session directory
        await fs.ensureDir(sessionDir);
        
        // Write files
        const pkPath = path.join(sessionDir, 'public_key.bin');
        const sigPath = path.join(sessionDir, 'signature.bin');
        const receiptPath = path.join(sessionDir, 'receipt.bin');
        
        await fs.writeFile(pkPath, Buffer.from(publicKey, 'hex'));
        await fs.writeFile(sigPath, Buffer.from(signature, 'hex'));
        
        // Run RISC Zero host
        const result = await runHostBinary([
            'verify',
            '--public-key', pkPath,
            '--signature', sigPath,
            '--message', message,
            '--output', receiptPath
        ]);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        // Read receipt and extract proof data
        const receiptData = await fs.readFile(receiptPath);
        const proof = await extractProofData(receiptData);
        
        res.json({
            success: true,
            proof: {
                journal: proof.journal,
                seal: proof.seal,
                isValid: proof.isValid,
                publicKeyHash: proof.publicKeyHash,
                messageHash: proof.messageHash
            }
        });
        
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        // Clean up session directory
        await fs.remove(sessionDir).catch(console.error);
    }
});

/**
 * Generate calldata for smart contract
 * POST /calldata
 * Body: { journal: string, seal: string }
 * Returns: { calldata: string }
 */
app.post('/calldata', (req, res) => {
    const { journal, seal } = req.body;
    
    if (!journal || !seal) {
        return res.status(400).json({ 
            error: 'Missing required fields: journal, seal' 
        });
    }
    
    // Generate calldata for verifySignature function
    const calldata = `0x${journal}${seal}`;
    
    res.json({ calldata });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'zkvm-service' });
});

// Run the RISC Zero host binary
function runHostBinary(args) {
    return new Promise((resolve) => {
        const child = spawn(HOST_BINARY, args, {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, stdout, stderr });
            } else {
                resolve({ success: false, error: stderr || stdout });
            }
        });
        
        child.on('error', (error) => {
            resolve({ success: false, error: error.message });
        });
    });
}

// Extract proof data from receipt
async function extractProofData(receiptData) {
    // This would deserialize the receipt and extract journal/seal
    // For now, we'll use a placeholder implementation
    const sessionId = uuidv4();
    const tempFile = path.join(TEMP_DIR, `${sessionId}_receipt.bin`);
    
    try {
        await fs.writeFile(tempFile, receiptData);
        
        const result = await runHostBinary([
            'extract',
            '--receipt', tempFile,
            '--format', 'hex'
        ]);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        // Parse the output to extract journal and seal
        const lines = result.stdout.split('\n');
        const journalLine = lines.find(line => line.startsWith('Journal:'));
        const sealLine = lines.find(line => line.startsWith('Receipt inner:'));
        
        const journal = journalLine ? journalLine.split('0x')[1] : '';
        const seal = sealLine ? 'placeholder_seal_data' : '';
        
        return {
            journal,
            seal,
            isValid: true, // This would be extracted from the journal
            publicKeyHash: '0x' + '0'.repeat(64), // Placeholder
            messageHash: '0x' + '0'.repeat(64) // Placeholder
        };
        
    } finally {
        await fs.remove(tempFile).catch(console.error);
    }
}

app.listen(PORT, () => {
    console.log(`zkVM service running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} in your browser`);
    console.log(`Host binary path: ${HOST_BINARY}`);
});