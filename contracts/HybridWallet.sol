// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * HybridWallet - Day 26
 * --------------------------------------------------------
 * • Dual-signature wallet: ECDSA (owner’s EO​A) **AND** PQ signature.
 * • Extensible enum `Algorithm` lets us add Falcon / Kyber later
 *   without touching high-level logic.
 * • Monotonic `txNonce` prevents replay of a PQ signature.
 * • Events help the scanner verify activity off-chain.
 */
contract HybridWallet {
    enum Algorithm { None, Dilithium, Falcon, Kyber }

    address   public owner;        // ECDSA controller
    Algorithm public pqAlgorithm;  // Which PQ scheme this wallet uses
    bytes     public pqPublicKey;  // Raw PQ public key bytes
    uint256   public txNonce;      // Bumps after every success

    event PQKeyRegistered(address indexed who, Algorithm algo, bytes pubKey);
    event TransactionExecuted(address indexed who, address to, uint256 value, bytes data);

    constructor() {
        owner      = msg.sender;
        pqAlgorithm = Algorithm.None;
        txNonce     = 0;
    }

    // ---------- 1.  Register / update PQ key ---------- //
    function registerPQKey(
        Algorithm algo,
        bytes   calldata newPubKey,
        bytes   calldata pqSignature      // may be empty on first set
    ) external {
        require(msg.sender == owner,                "only owner");
        require(algo != Algorithm.None,             "algo?");
        require(newPubKey.length != 0,              "key?");

        // On updates we *require* a proof-of-possession:
        if (pqAlgorithm != Algorithm.None) {
            require(pqSignature.length != 0,        "need proof");
        }

        if (pqSignature.length != 0) {
            bytes32 proofMsg = keccak256(abi.encodePacked(address(this), owner));
            bool ok = _verifyPQ(algo, newPubKey, proofMsg, pqSignature);
            require(ok, "bad proof");
        }

        pqAlgorithm = algo;
        pqPublicKey = newPubKey;

        emit PQKeyRegistered(owner, algo, newPubKey);
    }

    // ---------- 2.  Execute outbound transaction ---------- //
    function executeTransaction(
        address payable to,
        uint256         value,
        bytes   calldata data,
        bytes   calldata pqSignature
    ) external {
        require(msg.sender == owner,                "only owner");
        require(pqAlgorithm != Algorithm.None,      "no PQ key");
        require(pqSignature.length != 0,            "no PQ sig");

        bytes32 msgHash = keccak256(
            abi.encodePacked(address(this), to, value, keccak256(data), txNonce)
        );
        bool ok = _verifyPQ(pqAlgorithm, pqPublicKey, msgHash, pqSignature);
        require(ok, "bad PQ sig");

        // EFFECTS
        (bool success, ) = to.call{ value: value }(data);
        require(success, "call failed");

        txNonce += 1;
        emit TransactionExecuted(owner, to, value, data);
    }

    // ---------- 3.  Polymorphic verifier ---------- //
    function _verifyPQ(
        Algorithm algo,
        bytes memory pubKey,
        bytes32 message,
        bytes memory sig
    ) internal view returns (bool) {
        if (algo == Algorithm.Dilithium) {
            // TODO replace dummy check with true Dilithium logic / pre-compile
            return keccak256(sig) == message;
        } else if (algo == Algorithm.Falcon) {
            return false;           // stub
        } else if (algo == Algorithm.Kyber) {
            return false;           // Kyber = KEM, not sig
        }
        return false;
    }

    // Accept ETH
    receive() external payable {}
}
