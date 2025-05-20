// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DilithiumVerifier.sol";

contract DilithiumVerifierTest is Test {
    DilithiumVerifier verifier;
    uint256 priv;        // ECDSA private key
    address owner;       // derived ECDSA address
    bytes32 hMsg;        // message hash
    bytes pqSig;         // fake Dilithium sig (2700 B)

    function setUp() public {
        priv  = 0xABC123;
        owner = vm.addr(priv);
        verifier = new DilithiumVerifier(owner);

        hMsg = keccak256(bytes("Hello, quantum world!"));

        pqSig = new bytes(2700);
        for (uint256 i; i < 2700; ++i) pqSig[i] = bytes1(uint8((i*31)%256));
    }

    // happy path
    function testValidHybridSig() public {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(priv, hMsg);
        bytes memory ecdsa = abi.encodePacked(r,s,v);

        vm.deal(owner, 1 ether);
        vm.prank(owner);
        verifier.recordDilithiumSignature(hMsg, pqSig);

        bytes4 res = verifier.isValidSignature(hMsg, ecdsa);
        assertEq(uint32(res), uint32(0x1626ba7e));
    }

    // no PQ sig logged
    function testInvalidWithoutPQ() public {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(priv, hMsg);
        bytes memory ecdsa = abi.encodePacked(r,s,v);
        bytes4 res = verifier.isValidSignature(hMsg, ecdsa);
        assertEq(uint32(res), 0);
    }

    // wrong ECDSA key
    function testInvalidWithWrongECDSA() public {
        vm.deal(owner, 1 ether);
        vm.prank(owner);
        verifier.recordDilithiumSignature(hMsg, pqSig);

        uint256 badPriv = 0xBADDCAFE;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(badPriv, hMsg);
        bytes memory fakeSig = abi.encodePacked(r,s,v);
        bytes4 res = verifier.isValidSignature(hMsg, fakeSig);
        assertEq(uint32(res), 0);
    }
}
