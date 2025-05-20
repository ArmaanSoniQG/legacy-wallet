// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * EIP-1271 interface: allows a contract wallet to validate signatures.
 */
interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes memory sig) external view returns (bytes4);
}

contract DilithiumVerifier is IERC1271 {
    bytes4 internal constant MAGIC = 0x1626ba7e; // EIP-1271 success code
    address public immutable ownerECDSA;

    // messageHash => keccak256(Dilithium signature bytes)
    mapping(bytes32 => bytes32) private pqSigHash;

    event PQSignatureRecorded(bytes32 indexed msgHash, bytes32 pqHash);

    constructor(address _owner) {
        require(_owner != address(0), "zero owner");
        ownerECDSA = _owner;
    }

    // Owner (ECDSA address) logs the Dilithium signature hash on-chain
    function recordDilithiumSignature(bytes32 msgHash, bytes calldata pqSig) external {
        require(msg.sender == ownerECDSA, "not owner");
        bytes32 h = keccak256(pqSig);
        pqSigHash[msgHash] = h;
        emit PQSignatureRecorded(msgHash, h);
    }

    // EIP-1271 entry point
    function isValidSignature(bytes32 hash, bytes memory sig) public view override returns (bytes4) {
        if (sig.length != 65) return 0x00000000;

        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 0x20))
            s := mload(add(sig, 0x40))
            v := byte(0, mload(add(sig, 0x60)))
        }
        if (v < 27) v += 27;
        if (ecrecover(hash, v, r, s) != ownerECDSA) return 0x00000000;

        if (pqSigHash[hash] == bytes32(0)) return 0x00000000;

        return MAGIC;
    }
}
