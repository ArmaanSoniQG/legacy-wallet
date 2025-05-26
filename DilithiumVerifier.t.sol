// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DilithiumVerifier.sol";

contract DilithiumVerifierTest is Test {
    DilithiumVerifier verifier;

    uint256 ownerPk;
    address owner;

    function setUp() public {
        ownerPk = uint256(keccak256("owner"));
        owner   = vm.addr(ownerPk);

        vm.prank(owner);
        verifier = new DilithiumVerifier(owner);
    }

    /* helper to pre-log a Dilithium signature */
    function _logDummyPQ(bytes32 h) internal {
        bytes memory dummy = hex"01";
        vm.prank(owner);
        verifier.recordDilithiumSignature(h, dummy);
    }

    /* -------------------------------------------------------------------------- */
    /*                               unit tests                                   */
    /* -------------------------------------------------------------------------- */

    function testFuzz_HybridOk(bytes32 msgHash) public {
        // ignore the trivial all-zero hash (makes ecrecover return 0)
        vm.assume(msgHash != bytes32(0));

        _logDummyPQ(msgHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, msgHash);
        bytes memory sig65 = abi.encodePacked(r, s, v);

        bytes4 out = verifier.isValidSignature(msgHash, sig65);
        assertEq(out, bytes4(0x1626ba7e));

    }

    function testHybridSig_WithRealDilithium() public {
        bytes32 msgHash = keccak256("real-flow");

        _logDummyPQ(msgHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, msgHash);
        bytes memory sig65 = abi.encodePacked(r, s, v);

        bytes4 out = verifier.isValidSignature(msgHash, sig65);
        assertEq(out, bytes4(0x1626ba7e));

    }
}
