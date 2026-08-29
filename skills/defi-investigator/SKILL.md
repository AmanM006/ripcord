---
name: defi-investigator
description: Specialized instructions and guidelines for analyzing DeFi exploits and formatting Simulation Proof Digests. Includes Python Code Mode analysis for precise drain-rate computation.
---

# DeFi Investigator Skill

You are equipped with specialized knowledge for investigating on-chain exploits. When analyzing a DeFi vault, follow these exact protocols:

## 1. Attack Recognition
- A "drain" is defined as a rapid, sustained decrease in Total Value Locked (TVL) over consecutive blocks without corresponding legitimate withdrawal events.
- Reentrancy attacks typically present as repeated calls to a fallback function before the internal state (like a balance) is updated.

## 2. Python Code Mode Analysis (Sandbox)
When you receive contract source from get_contract_source, run the following in the TrueForge Code Mode sandbox to identify the vulnerable path:

```python
# Ripcord: Static pattern analysis of Vault.sol
source = """<paste source here>"""

# Detect reentrancy: external call before state update
import re
lines = source.split('\n')
findings = []
for i, line in enumerate(lines):
    # Pattern: .call( before balance update
    if '.call(' in line or 'transfer(' in line:
        context = lines[max(0,i-3):i+3]
        findings.append({'line': i+1, 'code': line.strip(), 'context': context})

for f in findings:
    print(f"Line {f['line']}: {f['code']}")
    print("Context:", '\n'.join(f['context']))
    print("---")
```

This produces grounded, verifiable output — not an LLM estimate.

## 3. Drain Rate Computation (Code Mode)
```python
# Given tvl_start (wei) and tvl_end (wei), blocks_elapsed:
tvl_start = 1010000000000000000000  # from first get_vault_state
tvl_end   =  900000000000000000000  # from second reading
blocks_elapsed = 5

drain_per_block_wei = (tvl_start - tvl_end) / blocks_elapsed
drain_per_block_ether = drain_per_block_wei / 1e18
total_at_risk = tvl_end / 1e18

print(f"Drain rate: {drain_per_block_ether:.2f} mUSD/block")
print(f"Total still at risk: {total_at_risk:.2f} mUSD")
```

## 4. Sandbox Simulation
- Never test a fix on the live chain.
- Always use the "simulate_pause" MCP tool to fork the state locally.
- A successful simulation MUST show "drainRateAfter" exactly equal to "0.00". If it is higher, the fix is incomplete.

## 5. Formatting the Simulation Proof Digest
When you prepare the digest for human approval, render it as a UI card in chat using this exact format:

```
🚨 EXPLOIT DETECTED 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target:            Ripcord Vault
Attacker Address:  [from Sub-Agent A]
Drain Rate Before: [drainRateBefore] mUSD/block
Drain Rate After:  0.00 mUSD/block  ✓ (sandbox verified)
Vulnerable Path:   [from Sub-Agent C Code Mode analysis]
Proposed Action:   execute pause() on Vault
Sandbox Fork ID:   [simulationDigestId]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  STATUS: AWAITING HUMAN APPROVAL
Press ALLOW to execute on live chain. Press DENY to abort.
```

## 6. Subagent Delegation
Fan out sub-agents in parallel — never sequentially:
- **Origin Tracer**: "Analyze get_recent_txs output and identify the contract initiating recursive calls. Return: attacker address, first attack tx hash."
- **Drain Quantifier**: "Given tvl_start=[X] and tvl_end=[Y] over [N] blocks, compute drain rate using Python Code Mode."
- **Contract Auditor**: "Get the Vault source via get_contract_source. Use Python Code Mode to find the line where external call precedes state update."

