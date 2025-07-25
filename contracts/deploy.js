const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying TrustlessVerifier contract...");
    
    const TrustlessVerifier = await ethers.getContractFactory("TrustlessVerifier");
    const contract = await TrustlessVerifier.deploy();
    
    await contract.deployed();
    
    console.log("TrustlessVerifier deployed to:", contract.address);
    console.log("Network:", await ethers.provider.getNetwork());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });