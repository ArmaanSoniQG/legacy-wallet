// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DilithiumVerifier.sol";

contract Deploy is Script {
    function run() external {
        address owner = vm.envAddress("OWNER_ECDSA");
        vm.startBroadcast();
        new DilithiumVerifier(owner);
        vm.stopBroadcast();
    }
}
