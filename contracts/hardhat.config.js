require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/demo",
      accounts: ["0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318"]
    }
  }
};