// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "forge-std/Test.sol";
import "../src/Vault.sol";
import "../src/MockToken.sol";
import "../src/Attacker.sol";

contract VaultTest is Test {
    Vault vault;
    MockToken token;
    Attacker attacker;

    function setUp() public {
        token = new MockToken();
        vault = new Vault(address(token));
        attacker = new Attacker(address(vault), address(token));
        
        token.mint(address(vault), 1000 ether); // seed fake TVL
        token.mint(address(attacker), 10 ether); 
        
        // Attacker needs to deposit first
        vm.prank(address(attacker));
        attacker.setupDeposit(10 ether);
    }

    function testExploitDrainsVaultWhenUnpaused() public {
        uint256 before = vault.totalTVL();
        vm.prank(address(attacker));
        attacker.attack(10 ether);
        assertLt(vault.totalTVL(), before, "vault should have drained via reentrancy");
    }

    function testPauseStopsExploit() public {
        vault.pause();
        vm.expectRevert("vault paused");
        vm.prank(address(attacker));
        attacker.attack(10 ether);
    }
}
