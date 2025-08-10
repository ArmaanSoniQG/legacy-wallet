const { ethers } = require('hardhat');

async function main() {
    console.log('🚀 Deploying SimpleQuantumWallet...');
    
    const SimpleQuantumWallet = await ethers.getContractFactory('SimpleQuantumWallet');
    const wallet = await SimpleQuantumWallet.deploy();
    
    await wallet.waitForDeployment();
    const address = await wallet.getAddress();
    
    console.log('✅ SimpleQuantumWallet deployed to:', address);
    
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