// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * HybridWallet – demo variant
 * ---------------------------------------------------------
 *  • owner‐only “PQ-key registration” kept from previous step
 *  • nonce, txNonce()  – still here for the UI
 *  • NEW  executeTransaction(...) so the front-end can call it
 *
 *  NOTE – executeTransaction only checks msg.sender == owner.
 *  Real Dilithium verification is sketched after the code.
 */
contract HybridWallet {
    /* storage ---------------------------------------------------- */
    address public owner;
    uint256 private _nonce;                    // starts at 0

    // tiny shim the UI already calls
    function txNonce(address) external view returns (uint256) {
        return _nonce;
    }

    /* Dilithium-5 byte-length guards ----------------------------- */
    uint16 internal constant PUB_BYTES = 2592;
    uint16 internal constant SIG_BYTES = 4597;

    /* algo-id ⇒ registered PQ-public-key */
    mapping(uint8 => bytes) public pqPubKey;   // algo 0 = Dilithium

    /* ctor ------------------------------------------------------- */
    constructor(address _owner) { owner = _owner; }

    /* owner helper ---------------------------------------------- */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "only owner");
        owner = newOwner;
    }

    /* PQ-key registration --------------------------------------- */
    function registerPQKey(
        uint8  algo,
        bytes  calldata pub,
        bytes  calldata sig
    ) external {
        require(msg.sender == owner, "only owner");
        require(pub.length == PUB_BYTES && sig.length == SIG_BYTES,
                "bad length");
        // (front-end already verified Dilithium signature)
        pqPubKey[algo] = pub;
    }

    /* -----------------------------------------------------------------
       NEW : executeTransaction
       UI hashes (wallet,to,value,data,nonce) off-chain and sends pqSig,
       but for the demo we *only* keep the owner check so it succeeds.
    ------------------------------------------------------------------*/
    function executeTransaction(
        address to,
        bytes   calldata data,
        bytes   calldata pqSig   // <-- unused in this stub
    ) external payable returns (bytes memory) {   //  ← payable & no value arg
        require(msg.sender == owner, "only owner");

        // ----- advance nonce the UI is tracking -----
        _nonce++;

        // ----- do the call / transfer ---------------
        (bool ok, bytes memory result) = to.call{value: msg.value}(data);
        require(ok, "low-level call failed");

        return result;
    }

    /* receive/fallback unchanged -------------------------------- */
    receive() external payable {}
}
