// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./TrustlessVerifier.sol";

contract HybridWallet {
    address public owner;
    uint256 private _nonce;
    TrustlessVerifier public immutable verifier;
    
    constructor(address _owner, address _verifier) { 
        owner = _owner; 
        verifier = TrustlessVerifier(_verifier);
    }

    function txNonce(address) external view returns (uint256) {
        return _nonce;
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "only owner");
        owner = newOwner;
    }

    function executeTransactionWithProof(
        address to,
        bytes calldata data,
        bytes calldata journal,
        bytes calldata seal
    ) external payable returns (bytes memory) {
        require(msg.sender == owner, "only owner");
        
        // Verify post-quantum signature via RISC Zero
        (bool isValid, , bytes32 messageHash) = verifier.verifySignature(journal, seal);
        require(isValid, "Invalid PQ signature");
        
        // Verify message hash matches transaction
        bytes32 expectedHash = keccak256(abi.encode(
            address(this), to, msg.value, keccak256(data), _nonce
        ));
        require(messageHash == expectedHash, "Transaction hash mismatch");
        
        _nonce++;
        
        (bool ok, bytes memory result) = to.call{value: msg.value}(data);
        require(ok, "Transaction failed");
        
        return result;
    }

    receive() external payable {}
}