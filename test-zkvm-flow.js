#!/usr/bin/env node

const ZKVM_SERVICE_URL = 'http://localhost:4000';

async function testZkVMFlow() {
    console.log('🧪 Testing complete zkVM flow...\n');
    
    try {
        // Step 1: Generate keys
        console.log('1️⃣ Generating Dilithium-5 keys...');
        const keyResponse = await fetch(`${ZKVM_SERVICE_URL}/generate-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const keyResult = await keyResponse.json();
        if (!keyResult.success) {
            throw new Error(`Key generation failed: ${keyResult.error}`);
        }
        
        console.log(`✅ Keys generated successfully`);
        console.log(`   Public key hash: ${keyResult.publicKeyHash}`);
        
        // Step 2: Test verification with a sample transaction hash
        console.log('\n2️⃣ Testing zkVM proof generation...');
        const sampleTxHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        
        const verifyResponse = await fetch(`${ZKVM_SERVICE_URL}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: sampleTxHash
            })
        });
        
        const verifyResult = await verifyResponse.json();
        if (!verifyResult.success) {
            throw new Error(`Verification failed: ${verifyResult.error}`);
        }
        
        console.log(`✅ zkVM proof generated successfully`);
        console.log(`   Journal length: ${verifyResult.proof.journal.length / 2} bytes`);
        console.log(`   Seal length: ${verifyResult.proof.seal.length / 2} bytes`);
        console.log(`   Is valid: ${verifyResult.proof.isValid}`);
        
        console.log('\n🎉 Complete zkVM flow working correctly!');
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        process.exit(1);
    }
}

testZkVMFlow();