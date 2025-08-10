// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SessionRootRegistry {
    struct SessionRoot {
        bytes32 merkleRoot;
        uint256 expiry;
        uint256 timestamp;
        address creator;
        bool active;
        string auditStatus; // "pending", "verified", "failed"
    }
    
    mapping(bytes32 => SessionRoot) public sessionRoots;
    mapping(address => bytes32[]) public userSessions;
    
    event SessionRootSet(bytes32 indexed rootHash, address indexed creator, uint256 expiry);
    event SessionAudited(bytes32 indexed rootHash, string status, bytes32 receiptHash);
    
    function setSessionRoot(
        bytes32 merkleRoot,
        uint256 duration
    ) external {
        bytes32 rootHash = keccak256(abi.encode(merkleRoot, msg.sender, block.timestamp));
        
        sessionRoots[rootHash] = SessionRoot({
            merkleRoot: merkleRoot,
            expiry: block.timestamp + duration,
            timestamp: block.timestamp,
            creator: msg.sender,
            active: true,
            auditStatus: "pending"
        });
        
        userSessions[msg.sender].push(rootHash);
        
        emit SessionRootSet(rootHash, msg.sender, block.timestamp + duration);
    }
    
    function validateInclusion(
        bytes32 rootHash,
        bytes32 leaf,
        bytes32[] calldata merkleProof
    ) external view returns (bool) {
        SessionRoot memory session = sessionRoots[rootHash];
        
        require(session.active, "Session not active");
        require(block.timestamp < session.expiry, "Session expired");
        
        // Verify Merkle proof
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < merkleProof.length; i++) {
            bytes32 proofElement = merkleProof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == session.merkleRoot;
    }
    
    function updateAuditStatus(
        bytes32 rootHash,
        string calldata status,
        bytes32 receiptHash
    ) external {
        require(sessionRoots[rootHash].creator == msg.sender, "Not session creator");
        sessionRoots[rootHash].auditStatus = status;
        
        emit SessionAudited(rootHash, status, receiptHash);
    }
    
    function getSessionRoot(bytes32 rootHash) external view returns (SessionRoot memory) {
        return sessionRoots[rootHash];
    }
}