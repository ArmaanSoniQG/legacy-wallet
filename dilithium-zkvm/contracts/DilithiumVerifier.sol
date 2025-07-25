// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@risczero/risc0/contracts/IRiscZeroVerifier.sol";

/**
 * @title DilithiumVerifier
 * @dev Smart contract for verifying Dilithium-5 signatures using RISC Zero zkVM proofs
 */
contract DilithiumVerifier {
    // RISC Zero verifier interface
    IRiscZeroVerifier public immutable riscZeroVerifier;
    
    // Image ID of the Dilithium verifier guest program
    bytes32 public immutable DILITHIUM_VERIFIER_ID;
    
    // Mapping from public key hash to registered user address
    mapping(bytes32 => address) public registeredKeys;
    
    // Events
    event KeyRegistered(bytes32 indexed publicKeyHash, address indexed owner);
    event SignatureVerified(bytes32 indexed publicKeyHash, bool isValid);
    
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
     * @return isValid Whether the signature is valid
     * @return publicKeyHash Hash of the public key used for verification
     */
    function verifySignature(bytes calldata journal, bytes calldata seal) 
        external 
        returns (bool isValid, bytes32 publicKeyHash) 
    {
        // Verify the RISC Zero proof
        riscZeroVerifier.verify(seal, DILITHIUM_VERIFIER_ID, journal);
        
        // Decode the journal to extract verification result
        // The journal format is: [isValid (1 byte), publicKeyHash (32 bytes)]
        isValid = journal[0] == 0x01;
        
        // Extract the public key hash from the journal
        publicKeyHash = bytes32(journal[1:33]);
        
        emit SignatureVerified(publicKeyHash, isValid);
        
        return (isValid, publicKeyHash);
    }
    
    /**
     * @dev Execute an action only if a valid signature from a registered key is provided
     * @param journal The journal from the RISC Zero receipt
     * @param seal The seal from the RISC Zero receipt
     * @param action The function to call if verification succeeds
     * @param actionData The calldata for the action function
     * @return success Whether the action was executed successfully
     * @return result The return data from the action
     */
    function executeWithSignature(
        bytes calldata journal,
        bytes calldata seal,
        address action,
        bytes calldata actionData
    ) external returns (bool success, bytes memory result) {
        // Verify the signature
        (bool isValid, bytes32 publicKeyHash) = verifySignature(journal, seal);
        
        // Check if the signature is valid and from a registered key
        require(isValid, "Invalid signature");
        require(registeredKeys[publicKeyHash] != address(0), "Public key not registered");
        
        // Execute the requested action
        (success, result) = action.call(actionData);
        require(success, "Action execution failed");
        
        return (success, result);
    }
}