const { ethers } = require('hardhat');

async function main() {
    console.log('🚀 Deploying QuantumSafeWallet...');
    
    // RISC Zero verifier address on Sepolia (from Boundless docs)
    const VERIFIER_ADDRESS = '0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187';
    
    // Dilithium program image ID (this would be your compiled zkVM program)
    const DILITHIUM_IMAGE_ID = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    const QuantumSafeWallet = await ethers.getContractFactory('QuantumSafeWallet');
    const wallet = await QuantumSafeWallet.deploy(VERIFIER_ADDRESS, DILITHIUM_IMAGE_ID);
    
    await wallet.waitForDeployment();
    const address = await wallet.getAddress();
    
    console.log('✅ QuantumSafeWallet deployed to:', address);
    console.log('🔗 Verifier:', VERIFIER_ADDRESS);
    console.log('🆔 Image ID:', DILITHIUM_IMAGE_ID);
    
    return address;
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;