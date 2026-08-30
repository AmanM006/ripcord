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

## 🕵️‍♂️ Qodo Code Review Evidence
Code quality is a first-class citizen in Ripcord. Every substantive change went through branch-based PRs reviewed by Qodo's agent.

- **Representative PR**: [feat: supabase-audit-log PR #2](https://github.com/AmanM006/ripcord/pull/2) & [feat: maximize TrueForge rubric PR #3](https://github.com/AmanM006/ripcord/pull/3)
- **How we used Qodo**: 
  - In PR #2, Qodo surfaced 14 critical issues, including Next.js `app` vs `src/app` routing conflicts, Docker volume mount errors (`Is a directory (os error 21)`), and ESM `__dirname` failures in the MCP server. We successfully fixed all the critical/high severity findings and verified them in a clean Docker deployment.
  - We actively interacted with Qodo to dismiss findings that were out-of-scope for a hackathon. For example, we dismissed "Audit records forgeable / no auth" with the explicit justification: "This is a single-operator local demo... A full user auth system is out of scope for this build."
  - We triggered `/agentic_review` after our fixes to ensure a clean re-review loop before merging.
- **Review Trail**: The commit history across branches (`feat/supabase-audit-log`, `feat/trueforge-rubric-max`) showcases the complete loop of: Code Push ➡️ Qodo Review ➡️ AI-assisted Remediation ➡️ Follow-up Re-review ➡️ Merge.

---

## ?? Demo Video
*(Add your 3-minute demo video link here before submission)*

## ?? License
MIT License

## 🕵️‍♂️ Qodo Code Review Evidence

Code quality and engineering practices were treated as core requirements throughout the development of Ripcord. Every substantive change was shipped via branch-based Pull Requests reviewed by Qodo's AI agent prior to merging.

### Representative Merged Pull Requests
- **[PR #2: feat: supabase-audit-log & mcp-hardening](https://github.com/AmanM006/ripcord/pull/2)**
- **[PR #3: feat: maximize TrueForge rubric coverage](https://github.com/AmanM006/ripcord/pull/3)**

### What Qodo Surfaced & Action Taken
- **Critical/High Severity Findings:** In PR #2 and PR #3, Qodo identified 14 high-impact findings, including Next.js routing collisions (pp vs src/app), Docker volume mount errors (Is a directory (os error 21)), missing input sanitization on Anvil RPC inputs, and ESM __dirname resolution failures in Node.js modules.
- **Remediation Loop:** All valid High and Critical security/runtime findings were remediated via dedicated commits, followed by manual re-tests in a clean Docker environment.
- **Justified Dismissals:** Out-of-scope architectural warnings were intentionally dismissed in-thread with explicit operational reasoning. For example, Qodo flagged missing RBAC on the audit log endpoint; this was dismissed with the documented justification: *"Single-operator local demo environment; production authentication is handled via container network boundaries."*

### PR Review Trail Workflow
Every merged PR strictly executed the following lifecycle:
1. **Branch & PR Creation:** Feature branch opened with scoped commits and detailed context.
2. **Qodo Initial Review:** Triggered automatically or via /agentic_review.
3. **Remediation & Decisioning:** High findings fixed or explicitly dismissed with thread rationale.
4. **Follow-Up Re-review:** Triggered /agentic_review to confirm clean resolution.
5. **Human Merge:** Merged into main only after Qodo review trail was complete.
