# ?? Ripcord — Simulation-First Approval Gate for On-Chain Incident Response

*An agent that watches a DeFi vault, detects an active exploit draining funds, proves in a sandbox that its fix actually stops the bleeding, then stops dead and waits for a human to click Allow before firing the real (irreversible) transaction.*

---

## ?? The Problem: Give Models a License to Act (Safely)
In incident response (like a DeFi exploit), speed is critical—but a wrong fix can make things worse. Fully autonomous agents can be dangerous if they make unverified changes to production. 

Ripcord solves this by letting the agent do the investigation and proving the fix works in a sandbox fork, but **stopping before the irreversible step** to get human approval.

---

## ??? Architecture & TrueForge Integration
Ripcord is designed specifically to push the **TrueForge Agent Harness** to its limits, integrating all advanced features:

| TrueForge Feature | How Ripcord Uses It |
|-------------------|----------------------|
| **MCP Servers** | Uses a custom ipcord-mcp to expose read/write access to the local Anvil chain (get_vault_state, propose_pause). |
| **Sandbox Execution** | Uses the sandbox to run a simulation fork (simulate_pause) that proves the fix actually drops the drainRate to 0 before proposing it. |
| **Human-in-the-Loop** | Built-in approval gate. The agent prepares a *Simulation Proof Digest* and pauses via TrueForge session state until a human hits "ALLOW". |
| **Subagents** | The main Incident Commander explicitly spawns subagents to read through raw hex transaction logs to find the attacker's origin without polluting its main context. |
| **Skills Registry** | Includes a custom .trueforge/skills/defi-investigator skill that instructs the agent exactly how to format the digest and recognize on-chain drains. |

---

## ?? Quickstart (Zero External Config)
To ensure judges can easily test this without dealing with wallet extensions, testnet faucets, or external RPCs, everything runs locally in Docker using Foundry's nvil.

1. Clone the repository:
   \\\ash
   git clone https://github.com/AmanM006/ripcord.git
   cd ripcord
   \\\

2. Copy the environment variables:
   \\\ash
   cp .env.example .env
   # Add your LLM_API_KEY to .env (e.g., openai/gpt-4o)
   \\\

3. Spin up the stack:
   \\\ash
   docker compose up --build -d
   \\\

4. **Experience the Demo**:
   - ??? **Dashboard**: Open http://localhost:3000 to see the Vault TVL and Approval Gate.
   - ?? **TrueForge UI**: Open http://localhost:8790 to watch the agent in action. Import the provided gent.json and start the session.
   - ?? **The Attack**: The attacker container will automatically start draining funds. Watch the agent detect it, run the sandbox proof, and request your approval on the dashboard!

---

## ?? Qodo Code Review Evidence
Code quality is a first-class citizen in Ripcord. Every substantive change went through branch-based PRs reviewed by Qodo's agent.

- **Representative PR**: [Test/session-persistence PR #1](https://github.com/AmanM006/ripcord/pull/1) & [Dashboard Polish PR #2](https://github.com/AmanM006/ripcord/pull/2)
- **How we used Qodo**: 
  - Qodo consistently surfaced issues with TypeScript ny types in our MCP server and Next.js SSR hydration mismatches in the dashboard.
  - We used the Qodo agent comments to isolate Docker permission issues in the deployer container and fix missing Node environment globals in the TrueForge service.
  - We dismissed findings regarding hardcoded chain IDs (31337) as this is explicitly designed for a local Anvil zero-config sandbox environment.
- **Review Trail**: The commit history across branches (eat/dashboard-polish, ix/mcp-server-tools) shows the loop of code -> Qodo review -> AI-assisted remediation -> follow-up review -> merge.

---

## ?? Demo Video
*(Add your 3-minute demo video link here before submission)*

## ?? License
MIT License
