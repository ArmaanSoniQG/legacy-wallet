// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DilithiumRegistry {
    event Registered(address indexed owner, bytes32 pqPubKey);

    mapping(address => bytes32) public pqKeyOf; // compressed 32-byte pubkey

    function register(bytes32 pqPubKey) external {
        require(pqKeyOf[msg.sender] == bytes32(0), "already registered");
        pqKeyOf[msg.sender] = pqPubKey;
        emit Registered(msg.sender, pqPubKey);
    }
}
