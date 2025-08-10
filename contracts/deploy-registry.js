const { ethers } = require('hardhat');

async function main() {
    console.log('🚀 Deploying SessionRootRegistry...');
    
    const SessionRootRegistry = await ethers.getContractFactory('SessionRootRegistry');
    const registry = await SessionRootRegistry.deploy();
    
    await registry.waitForDeployment();
    const address = await registry.getAddress();
    
    console.log('✅ SessionRootRegistry deployed to:', address);
    
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