// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleQuantumWallet {
    struct Session {
        bytes32 proofHash;
        uint256 expiry;
        bool active;
    }
    
    mapping(address => Session) public sessions;
    
    event SessionCreated(address indexed user, uint256 expiry);
    event TransactionValidated(address indexed user, address indexed to, uint256 amount);
    
    function createSession(
        bytes32 proofHash,
        uint256 duration
    ) external {
        // Create session with proof hash
        sessions[msg.sender] = Session({
            proofHash: proofHash,
            expiry: block.timestamp + duration,
            active: true
        });
        
        emit SessionCreated(msg.sender, block.timestamp + duration);
    }
    
    function validateTransaction(
        address to,
        uint256 amount,
        bytes32 txHash
    ) external view returns (bool) {
        Session memory session = sessions[msg.sender];
        
        // Check session is active and not expired
        require(session.active, "No active session");
        require(block.timestamp < session.expiry, "Session expired");
        
        // Session exists and is valid
        return true;
    }
    
    function getSession(address user) external view returns (Session memory) {
        return sessions[user];
    }
}