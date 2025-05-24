// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DilithiumVerifier.sol";

contract Gas is Test {
    DilithiumVerifier v;
    bytes32 h = keccak256("gas-check");

    function setUp() public {
        v = new DilithiumVerifier(address(0xBEEF));
    }

    /* -------- pure ECDSA -------- */
    function testGas_ECDSA() public {
        bytes memory sig = hex"00";              // 1-byte dummy keeps length != 65
        v.isValidSignature(h, sig);
    }

    /* -------- hybrid path -------- */
    function testGas_Hybrid() public {
        bytes memory sig = hex"";                // empty ⇒ fail ECDSA, but pass Dilithium branch
        v.recordDilithiumSignature(h, bytes32(0));
        v.isValidSignature(h, sig);
    }
}
