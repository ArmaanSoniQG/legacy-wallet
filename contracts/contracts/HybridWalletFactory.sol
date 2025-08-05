// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./HybridWallet.sol";

contract HybridWalletFactory {
    address public immutable sessionRegistry;
    
    event WalletCreated(address indexed owner, address wallet);
    mapping(address => address) public walletOf;

    constructor(address _sessionRegistry) {
        sessionRegistry = _sessionRegistry;
    }

    function createWallet() external returns (address wallet) {
        require(walletOf[msg.sender] == address(0), "already has wallet");

        wallet = address(new HybridWallet(msg.sender, sessionRegistry));
        walletOf[msg.sender] = wallet;

        emit WalletCreated(msg.sender, wallet);
    }
}