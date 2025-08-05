// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SessionRegistry {
    struct Session {
        bytes32 publicKeyHash;
        bytes32 proofHash;
        uint256 expiry;
        bool active;
    }
    
    mapping(address => Session) public sessions;
    mapping(bytes32 => bool) public usedProofs;
    
    uint256 public constant SESSION_DURATION = 24 hours;
    
    event SessionCreated(address indexed user, bytes32 publicKeyHash, bytes32 proofHash, uint256 expiry);
    event SessionExpired(address indexed user);
    
    function createSession(
        bytes32 publicKeyHash,
        bytes calldata journal,
        bytes calldata seal
    ) external {
        require(publicKeyHash != bytes32(0), "Invalid public key hash");
        require(seal.length > 0, "Empty seal");
        require(journal.length >= 32, "Invalid journal");
        
        // Create proof hash from journal + seal
        bytes32 proofHash = keccak256(abi.encodePacked(journal, seal));
        require(!usedProofs[proofHash], "Proof already used");
        
        // For now, assume proof is valid (real RISC Zero verification would go here)
        bool isValid = true;
        require(isValid, "Invalid zkVM proof");
        
        uint256 expiry = block.timestamp + SESSION_DURATION;
        
        sessions[msg.sender] = Session({
            publicKeyHash: publicKeyHash,
            proofHash: proofHash,
            expiry: expiry,
            active: true
        });
        
        usedProofs[proofHash] = true;
        
        emit SessionCreated(msg.sender, publicKeyHash, proofHash, expiry);
    }
    
    function isSessionValid(address user) external view returns (bool) {
        Session memory session = sessions[user];
        return session.active && block.timestamp < session.expiry;
    }
    
    function getSession(address user) external view returns (Session memory) {
        return sessions[user];
    }
    
    function expireSession() external {
        require(sessions[msg.sender].active, "No active session");
        sessions[msg.sender].active = false;
        emit SessionExpired(msg.sender);
    }
}