// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

bytes4 constant MAGICVALUE = 0x1626ba7e;      // EIP-1271 magic

contract DilithiumVerifier {
    address  public owner;                       // ECDSA address
    bytes     public dilithiumPubKey;            // stored for reference
    bytes32   public expectedDilithiumSigHash;   // set by off-chain verifier

    constructor(address _owner, bytes memory _pqPub) {
        owner = _owner;
        dilithiumPubKey = _pqPub;
    }

    function setExpectedDilithiumSigHash(bytes32 h) external {
        require(msg.sender == owner, "not owner");
        expectedDilithiumSigHash = h;
    }

    /*  hybrid-sig = 65-byte ECDSA  +  Dilithium bytes
        returns MAGICVALUE only if:
        – ECDSA recovers → owner
        – Dilithium bytes exist
        – kec   cak256(Dilithium) == expected hash (if hash set)          */
    function isValidSignature(bytes32 hash, bytes calldata sig)
        external view returns (bytes4)
    {
        if (sig.length < 65) return 0x00000000;

        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v :=  byte(0, calldataload(add(sig.offset, 64)))
        }
        if (ecrecover(hash, v, r, s) != owner) return 0x00000000;

        uint256 pqLen = sig.length - 65;
        if (pqLen == 0) return 0x00000000;

        if (expectedDilithiumSigHash != bytes32(0)) {
            bytes32 got;
            assembly { got := keccak256(add(sig.offset, 65), pqLen) }
            if (got != expectedDilithiumSigHash) return 0x00000000;
        }
        return MAGICVALUE;
    }
}
