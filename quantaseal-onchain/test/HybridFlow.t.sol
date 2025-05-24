// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/DilithiumVerifier.sol";

contract HybridFlow is Test {
    DilithiumVerifier verifier;
    uint256 ownerPk;
    address owner;

    function setUp() public {
        ownerPk = uint256(keccak256("owner")) % type(uint256).max;
        owner   = vm.addr(ownerPk);
        vm.prank(owner);
        verifier = new DilithiumVerifier(owner); // pass owner address 
    }

    function testHybridHappyPath() public {
        // ---------------------------------- msg hash
        bytes32 msgHash = keccak256("hello world");
        // ---------------------------------- PQ sig hash (stub)
        bytes32 pqHash  = keccak256("dummy-pq-sig");
        // owner calls recordDilithiumSignature
        vm.prank(owner);
        verifier.recordDilithiumSignature(msgHash, abi.encodePacked(pqHash));

        // ---------------------------------- ECDSA signature
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, msgHash);
        bytes memory sig65 = abi.encodePacked(r, s, v);

        // ---------------------------------- verify
        bytes4 MAGIC = 0x1626ba7e;
        bytes4 out   = verifier.isValidSignature(msgHash, sig65);
        assertEq(out, MAGIC);
    }
}
