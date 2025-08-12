const ethers = require('ethers');

// Wait for transaction with timeout and retry logic
async function waitForConfirmWithTimeout(provider, txHash, confirmations = 1, timeoutMs = 60000) {
    const txPromise = provider.waitForTransaction(txHash, confirmations);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('tx_wait_timeout')), timeoutMs)
    );
    
    return Promise.race([txPromise, timeoutPromise]);
}

// Calculate bumped gas fees for retry
function calculateBumpedFees(attempt = 0) {
    const baseFee = ethers.parseUnits('20', 'gwei');
    const baseTip = ethers.parseUnits('2', 'gwei');
    
    // Increase by 20% per attempt
    const multiplier = Math.pow(1.2, attempt);
    
    return {
        maxFeePerGas: baseFee * BigInt(Math.floor(multiplier * 100)) / 100n,
        maxPriorityFeePerGas: baseTip * BigInt(Math.floor(multiplier * 100)) / 100n
    };
}

// Check if transaction is still pending
async function isTransactionPending(provider, txHash) {
    try {
        const tx = await provider.getTransaction(txHash);
        return tx && tx.blockNumber === null;
    } catch {
        return false;
    }
}

module.exports = {
    waitForConfirmWithTimeout,
    calculateBumpedFees,
    isTransactionPending
};