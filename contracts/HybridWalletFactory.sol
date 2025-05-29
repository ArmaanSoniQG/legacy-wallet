// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./HybridWallet.sol";

contract HybridWalletFactory {
    event WalletCreated(address indexed owner, address wallet);
    mapping(address => address) public walletOf;

    function createWallet() external returns (address wallet) {
        require(walletOf[msg.sender] == address(0), "already has wallet");

        // pass owner in constructor → no need for transferOwnership
        wallet = address(new HybridWallet(msg.sender));
        walletOf[msg.sender] = wallet;

        emit WalletCreated(msg.sender, wallet);
    }
}
