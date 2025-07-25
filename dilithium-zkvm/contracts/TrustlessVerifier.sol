// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@risczero/risc0/contracts/IRiscZeroVerifier.sol";

/**
 * @title TrustlessVerifier
 * @dev Smart contract for verifying Dilithium-5 signatures using RISC Zero zkVM proofs
 */
contract TrustlessVerifier {
    // RISC Zero verifier interface
    IRiscZeroVerifier public immutable riscZeroVerifier;
    
    // Image ID of the Dilithium verifier guest program
    bytes32 public immutable DILITHIUM_VERIFIER_ID;
    
    // Mapping from public key hash to registered user address
    mapping(bytes32 => address) public registeredKeys;
    
    // Events
    event KeyRegistered(bytes32 indexed publicKeyHash, address indexed owner);
    event SignatureVerified(bytes32 indexed publicKeyHash, bytes32 indexed messageHash, bool isValid);
    event TransactionExecuted(bytes32 indexed publicKeyHash, bytes32 indexed messageHash, address target, bool success);
    
    // Verification result structure
    struct VerificationResult {
        bool isValid;
        bytes32 publicKeyHash;
        bytes32 messageHash;
    }
    
    /**
     * @dev Constructor
     * @param _riscZeroVerifier Address of the RISC Zero verifier contract
     * @param _dilithiumVerifierId Image ID of the Dilithium verifier guest program
     */
    constructor(address _riscZeroVerifier, bytes32 _dilithiumVerifierId) {
        riscZeroVerifier = IRiscZeroVerifier(_riscZeroVerifier);
        DILITHIUM_VERIFIER_ID = _dilithiumVerifierId;
    }
    
    /**
     * @dev Register a Dilithium public key hash with a user address
     * @param publicKeyHash Hash of the Dilithium public key
     */
    function registerKey(bytes32 publicKeyHash) external {
        registeredKeys[publicKeyHash] = msg.sender;
        emit KeyRegistered(publicKeyHash, msg.sender);
    }
    
    /**
     * @dev Verify a Dilithium signature using a RISC Zero proof
     * @param journal The journal from the RISC Zero receipt
     * @param seal The seal from the RISC Zero receipt
     * @return result The verification result
     */
    function verifySignature(bytes calldata journal, bytes calldata seal) 
        external 
        returns (VerificationResult memory result) 
    {
        // Verify the RISC Zero proof
        riscZeroVerifier.verify(seal, DILITHIUM_VERIFIER_ID, journal);
        
        // Decode the journal to extract verification result
        result = abi.decode(journal, (VerificationResult));
        
        emit SignatureVerified(result.publicKeyHash, result.messageHash, result.isValid);
        
        return result;
    }
    
    /**
     * @dev Execute a transaction if the signature verification is valid
     * @param journal The journal from the RISC Zero receipt
     * @param seal The seal from the RISC Zero receipt
     * @param target The address to call
     * @param value The amount of ETH to send
     * @param data The calldata for the transaction
     * @return success Whether the transaction was executed successfully
     */
    function executeTransaction(
        bytes calldata journal,
        bytes calldata seal,
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (bool success) {
        // Verify the signature
        VerificationResult memory result = verifySignature(journal, seal);
        
        // Check if the signature is valid and from a registered key
        require(result.isValid, "Invalid signature");
        require(registeredKeys[result.publicKeyHash] != address(0), "Public key not registered");
        
        // Execute the transaction
        (success, ) = target.call{value: value}(data);
        require(success, "Transaction execution failed");
        
        emit TransactionExecuted(result.publicKeyHash, result.messageHash, target, success);
        
        return success;
    }
}