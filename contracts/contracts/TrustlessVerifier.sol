// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TrustlessVerifier {
    mapping(address => bytes32) public registeredKeys;
    
    event KeyRegistered(address indexed user, bytes32 publicKeyHash);
    event SignatureVerified(address indexed user, bool isValid, bytes32 publicKeyHash, bytes32 messageHash);
    
    function registerKey(bytes32 publicKeyHash) external {
        registeredKeys[msg.sender] = publicKeyHash;
        emit KeyRegistered(msg.sender, publicKeyHash);
    }
    
    function verifySignature(bytes calldata journal, bytes calldata seal) external returns (bool isValid, bytes32 publicKeyHash, bytes32 messageHash) {
        publicKeyHash = registeredKeys[msg.sender];
        require(publicKeyHash != bytes32(0), "No registered key");
        
        // Verify seal is not empty (real RISC Zero verification would validate the proof)
        require(seal.length > 0, "Empty seal");
        isValid = true; // For now, assume valid if seal exists
        
        // The journal should contain the transaction hash as the first 32 bytes
        // This is what our zkVM guest code commits
        require(journal.length >= 32, "Invalid journal length");
        messageHash = bytes32(journal[0:32]);
        
        emit SignatureVerified(msg.sender, isValid, publicKeyHash, messageHash);
        return (isValid, publicKeyHash, messageHash);
    }
}