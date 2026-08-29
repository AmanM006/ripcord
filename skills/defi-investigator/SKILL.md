---
name: defi-investigator
description: Specialized instructions and guidelines for analyzing DeFi exploits and formatting Simulation Proof Digests.
---

# DeFi Investigator Skill

You are equipped with specialized knowledge for investigating on-chain exploits. When analyzing a DeFi vault, follow these exact protocols:

## 1. Attack Recognition
- A "drain" is defined as a rapid, sustained decrease in Total Value Locked (TVL) over consecutive blocks without corresponding legitimate withdrawal events.
- Reentrancy attacks typically present as repeated calls to a fallback function before the internal state (like a balance) is updated.

## 2. Sandbox Simulation
- Never test a fix on the live chain.
- Always use the "simulate_pause" MCP tool to fork the state locally.
- A successful simulation MUST show "drainRateAfter" exactly equal to "0.00". If it is higher, the fix is incomplete.

## 3. Formatting the Simulation Proof Digest
When you prepare the digest for human approval, you must format it exactly like this in your thought process and output:

`
?? EXPLOIT DETECTED ??
Target: Vulnerable Vault
Drain Rate Before Fix: [drainRateBefore] mUSD/block
Drain Rate After Fix: [drainRateAfter] mUSD/block
Proposed Action: execute pause() via CircuitBreaker
Status: AWAITING HUMAN APPROVAL
`

## 4. Subagent Delegation
When dealing with complex on-chain data (e.g., parsing hundreds of transactions to find the attacker's address), you should explicitly instruct a subagent:
*"Subagent, please analyze the last 50 transactions to identify the contract address initiating the recursive calls."*
Do not clutter your main context with raw transaction logs.
