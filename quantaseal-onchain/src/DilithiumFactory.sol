// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DilithiumVerifier.sol";

/**
 * Minimal proxy-free factory (cheap).  One deploy tx = one verifier.
 * Emits the new address so the UI can grab it.
 */
contract DilithiumFactory {
    event VerifierDeployed(address indexed owner, address verifier);

    /**
     * Deploy a verifier for `msg.sender`.  Reverts if she already has one.
     * The mapping is only to stop accidental duplicates.
     */
    mapping(address => address) public verifierOf;

    function deploy() external returns (DilithiumVerifier v) {
        require(verifierOf[msg.sender] == address(0), "already has verifier");
        v = new DilithiumVerifier(msg.sender);
        verifierOf[msg.sender] = address(v);
        emit VerifierDeployed(msg.sender, address(v));
    }
}

