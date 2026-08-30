// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Vault.sol";
import "../src/MockToken.sol";
import "../src/Attacker.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        vm.startBroadcast(deployerPrivateKey);

        MockToken token = new MockToken();
        Vault vault = new Vault(address(token));
        Attacker attacker = new Attacker(address(vault), address(token));

        token.mint(address(vault), 10000 ether); // seed fake TVL — large so drain is visible for demo
        token.mint(address(attacker), 500 ether); // seed attacker with enough for many drain cycles
        
        vm.stopBroadcast();

        vm.startBroadcast(deployerPrivateKey);
        // Pre-deposit first 10 ETH stake so the attacker is ready to run immediately
        attacker.setupDeposit(10 ether);
        vm.stopBroadcast();

        // Print addresses as JSON
        string memory json = string(
            abi.encodePacked(
                '{ "MockToken": "', vm.toString(address(token)),
                '", "Vault": "', vm.toString(address(vault)),
                '", "Attacker": "', vm.toString(address(attacker)), '" }'
            )
        );
        vm.writeFile("/out/deploy-addresses.json", json);
    }
}
