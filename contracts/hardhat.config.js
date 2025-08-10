require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: ["a8d7b5049c2004e397a5fa3dcf905d121ac02fa8b74e068d421e080c8b459efd"]
    }
  }
};