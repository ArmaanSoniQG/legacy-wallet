// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DilithiumVerifier.sol";

contract HybridFlow is Test {
    DilithiumVerifier verifier;
    uint256           ownerPk;
    address           owner;

    function setUp() public {
        ownerPk = uint256(keccak256("owner"));
        owner   = vm.addr(ownerPk);

        vm.prank(owner);
        verifier = new DilithiumVerifier(owner);
    }

    /* -------------------------------------------------------------------------- */
    /*                               helper routine                               */
    /* -------------------------------------------------------------------------- */

    function _logDummyPQ(bytes32 h) internal {
        bytes memory dummy = hex"01";          // any non-empty bytes
        vm.prank(owner);                       // call as the owner
        verifier.recordDilithiumSignature(h, dummy);
    }

    /* -------------------------------------------------------------------------- */
    /*                               happy path test                              */
    /* -------------------------------------------------------------------------- */

    function testHybridHappyPath() public {
        /* 1 ─ message hash ---------------------------------------------------- */
        bytes32 msgHash = keccak256("hello world");

        /* 2 ─ store Dilithium sig hash on-chain -------------------------------- */
        _logDummyPQ(msgHash);

        /* 3 ─ produce a raw 65-byte ECDSA signature --------------------------- */
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, msgHash);
        bytes memory sig65 = abi.encodePacked(r, s, v);

        /* 4 ─ hybrid verification -------------------------------------------- */
        bytes4 out = verifier.isValidSignature(msgHash, sig65);
        assertEq(out, bytes4(0x1626ba7e));

    }
}
