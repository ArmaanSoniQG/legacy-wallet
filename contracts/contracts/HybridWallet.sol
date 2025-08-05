// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./SessionRegistry.sol";

contract HybridWallet {
    address public owner;
    uint256 private _nonce;
    SessionRegistry public immutable sessionRegistry;
    
    constructor(address _owner, address _sessionRegistry) { 
        owner = _owner; 
        sessionRegistry = SessionRegistry(_sessionRegistry);
    }

    function txNonce(address) external view returns (uint256) {
        return _nonce;
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "only owner");
        owner = newOwner;
    }

    function executeTransactionWithSession(
        address to,
        bytes calldata data
    ) external payable returns (bytes memory) {
        require(msg.sender == owner, "only owner");
        
        // Verify active session exists (instant check)
        require(sessionRegistry.isSessionValid(owner), "No valid session");
        
        _nonce++;
        
        (bool ok, bytes memory result) = to.call{value: msg.value}(data);
        require(ok, "Transaction failed");
        
        return result;
    }
    
    // Legacy method for backward compatibility
    function executeTransactionWithProof(
        address to,
        bytes calldata data,
        bytes calldata journal,
        bytes calldata seal
    ) external payable returns (bytes memory) {
        require(msg.sender == owner, "only owner");
        require(sessionRegistry.isSessionValid(owner), "No valid session");
        
        _nonce++;
        
        (bool ok, bytes memory result) = to.call{value: msg.value}(data);
        require(ok, "Transaction failed");
        
        return result;
    }

    receive() external payable {}
}