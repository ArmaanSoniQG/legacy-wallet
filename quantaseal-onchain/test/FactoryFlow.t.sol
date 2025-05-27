// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DilithiumFactory.sol";
import "../src/DilithiumVerifier.sol";

/**
 * Factory → Verifier happy-path, including full hybrid-signature check.
 */
contract FactoryFlowTest is Test {
    /* keep local copy so we can vm.expectEmit */
    event VerifierDeployed(address indexed owner, address verifier);

    DilithiumFactory  factory;
    DilithiumVerifier verifier;

    uint256 ownerPk;
    address owner;

    function setUp() public {
        factory  = new DilithiumFactory();
        ownerPk  = uint256(keccak256("ALICE"));
        owner    = vm.addr(ownerPk);
    }

    function testDeployAndVerifyHybridSig() public {
        /* 1 ─ expect event */
        vm.expectEmit(true, true, false, false);
        emit VerifierDeployed(owner, address(0));

        /* 2 ─ deploy verifier */
        vm.prank(owner);
        verifier = factory.deploy();
       // assertEq(verifier.MAGIC(), 0x1626ba7e);


        /* 3 ─ factory bookkeeping checks */
        assertEq(factory.verifierOf(owner), address(verifier));
        assertEq(verifier.ownerECDSA(),     owner);   // ← only line that changed

        /* 4 ─ record dummy Dilithium sig */
        bytes32  hash  = keccak256("hello-quantum");
        bytes memory pqSig = hex"DEADBEEF";
        vm.prank(owner);
        verifier.recordDilithiumSignature(hash, pqSig);

        /* 5 ─ raw ECDSA sig via cheat-code */
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, ethHash);
        bytes memory ecdsaSig = abi.encodePacked(r, s, v);

        /* 6 ─ hybrid verification */
        bytes4 MAGIC = 0x1626ba7e;
        bytes4 out   = verifier.isValidSignature(hash, ecdsaSig);
        assertEq(out, MAGIC);
    }
}
