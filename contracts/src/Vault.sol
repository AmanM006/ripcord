// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "./MockToken.sol";

contract Vault {
    MockToken public token;
    address public owner;
    bool public paused;
    mapping(address => uint256) public deposits;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Paused(address indexed by);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier whenNotPaused() { require(!paused, "vault paused"); _; }

    constructor(address _token) {
        token = MockToken(_token);
        owner = msg.sender;
    }

    function deposit(uint256 amount) external whenNotPaused {
        token.transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    // VULNERABLE ON PURPOSE: state update happens AFTER the external call.
    // Callback lets an attacker re-enter withdraw() before deposits[msg.sender]
    // is decremented — textbook reentrancy, Slither flags this immediately.
    function withdraw(uint256 amount) external whenNotPaused {
        require(deposits[msg.sender] >= amount, "insufficient balance");
        (bool ok, ) = msg.sender.call(abi.encodeWithSignature("onWithdraw(uint256)", amount));
        token.transfer(msg.sender, amount);
        deposits[msg.sender] -= amount;   // <-- too late, this is the bug
        emit Withdraw(msg.sender, amount);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function totalTVL() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
