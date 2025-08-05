const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying QuantaSeal contracts (Session-Based Architecture)...");
  
  // Deploy SessionRegistry
  const SessionRegistry = await ethers.getContractFactory("SessionRegistry");
  const sessionRegistry = await SessionRegistry.deploy();
  await sessionRegistry.waitForDeployment();
  
  console.log("✅ SessionRegistry deployed to:", await sessionRegistry.getAddress());
  
  // Deploy TrustlessVerifier (for backward compatibility)
  const TrustlessVerifier = await ethers.getContractFactory("TrustlessVerifier");
  const verifier = await TrustlessVerifier.deploy();
  await verifier.waitForDeployment();
  
  console.log("✅ TrustlessVerifier deployed to:", await verifier.getAddress());
  
  // Deploy HybridWalletFactory
  const HybridWalletFactory = await ethers.getContractFactory("HybridWalletFactory");
  const factory = await HybridWalletFactory.deploy(await sessionRegistry.getAddress());
  await factory.waitForDeployment();
  
  console.log("✅ HybridWalletFactory deployed to:", await factory.getAddress());
  
  console.log("\n📋 Update these addresses in your UI:");
  console.log(`VITE_FACTORY_ADDRESS=${await factory.getAddress()}`);
  console.log(`VITE_SESSION_REGISTRY_ADDRESS=${await sessionRegistry.getAddress()}`);
  console.log(`VITE_VERIFIER_ADDRESS=${await verifier.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});