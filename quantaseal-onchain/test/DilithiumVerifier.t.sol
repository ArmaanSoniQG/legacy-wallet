// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/*──────────────────────────────────────────────────────────────────────────────
  Forge cheat-code handle (vm)
──────────────────────────────────────────────────────────────────────────────*/
import "forge-std/Vm.sol";
Vm constant vm = Vm(
    address(uint160(uint256(keccak256("hevm cheat code"))))
);

/*──────────────────────────────────────────────────────────────────────────────
  Imports
──────────────────────────────────────────────────────────────────────────────*/
import "forge-std/Test.sol";          // assertions + vm again
import "../src/DilithiumVerifier.sol";

/*──────────────────────────────────────────────────────────────────────────────
  Test contract
──────────────────────────────────────────────────────────────────────────────*/
contract DilithiumVerifierTest is Test {
    DilithiumVerifier verifier;

    uint256 private priv;      // ECDSA test key
    address private owner;     // derived address

    /*── setUp ───────────────────────────────────────────────────────────────*/
    function setUp() public {
        priv  = 0xABC123;
        owner = vm.addr(priv);
        verifier = new DilithiumVerifier(owner);
    }

    /*── helper: make ECDSA sig ──────────────────────────────────────────────*/
    function _ecdsa(bytes32 h) internal view returns (bytes memory sig) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(priv, h);
        sig = abi.encodePacked(r, s, v);
    }

    /*── helper: call Node to get Dilithium-5 sig via FFI ────────────────────*/
    function _pq(bytes32 h) internal returns (bytes memory pq) {
        string[] memory cmd = new string[](3); // ← array declared here
        cmd[0] = "node";
        cmd[1] = "script/genSig.js";
        cmd[2] = vm.toString(h);                 // hash as hex (no 0x)
        pq = vm.ffi(cmd);                        // run script, capture bytes
    }

    /*── 1. happy-path test ─────────────────────────────────────────────────*/
    function testHybridSig_WithRealDilithium() public {
        bytes32 h = keccak256("Hello, world!");
        vm.deal(owner, 1 ether);
        vm.prank(owner);
        verifier.recordDilithiumSignature(h, _pq(h));

        bytes4 res = verifier.isValidSignature(h, _ecdsa(h));
        assertEq(uint32(res), uint32(0x1626ba7e));
    }

    /*── 2. fuzz any message ────────────────────────────────────────────────*/
    function testFuzz_HybridOk(bytes calldata msgData) public {
        bytes32 h = keccak256(msgData);
        vm.deal(owner, 1 ether);
        vm.prank(owner);
        verifier.recordDilithiumSignature(h, _pq(h));

        bytes4 res = verifier.isValidSignature(h, _ecdsa(h));
        assertEq(uint32(res), uint32(0x1626ba7e));
    }
}
