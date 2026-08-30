// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Vault.sol";
import "../src/MockToken.sol";
import "../src/Attacker.sol";

contract AttackTest is Test {
    MockToken token;
    Vault vault;
    Attacker attacker;

    function setUp() public {
        token = new MockToken();
        vault = new Vault(address(token));
        attacker = new Attacker(address(vault), address(token));

        token.mint(address(vault), 1000 ether);
        token.mint(address(attacker), 100 ether);
        attacker.setupDeposit(10 ether);
    }

    function testAttack() public {
        uint256 startBal = token.balanceOf(address(vault));
        console.log("Start Vault TVL:", startBal);
        
        attacker.attack(10 ether);
        
        uint256 endBal = token.balanceOf(address(vault));
        console.log("End Vault TVL:", endBal);
        console.log("Attacker Reentries:", attacker.reentryCount());
    }
}
