// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/TrustlessVerifier.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        
        TrustlessVerifier verifier = new TrustlessVerifier();
        
        console.log("TrustlessVerifier deployed to:", address(verifier));
        
        vm.stopBroadcast();
    }
}