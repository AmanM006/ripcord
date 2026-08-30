#!/usr/bin/env python3
"""
trueforge-init: Idempotent setup script.
Registers OpenAI provider, ripcord-chain MCP server, and the ripcord agent
into TrueForge on every cold-start. Safe to re-run — uses PUT to upsert.
"""
import requests, json, time, sys, os

sys.stdout.reconfigure(encoding='utf-8')

TF = "http://trueforge:8790/api/v1"
API_KEY = os.environ.get("OPENAI_API_KEY", "")
MCP_URL = "http://mcp-server:8811/sse"

def wait_for_trueforge():
    print("[init] Waiting for TrueForge to be ready...")
    for _ in range(60):
        try:
            r = requests.get(f"{TF}/agents", timeout=3)
            if r.status_code == 200:
                print("[init] TrueForge is up.")
                return True
        except Exception:
            pass
        time.sleep(2)
    print("[init] ERROR: TrueForge did not become ready in time.")
    sys.exit(1)

def register_model_provider():
    # Check if already exists
    existing = requests.get(f"{TF}/settings/model-providers").json()
    providers = [p["name"] for p in existing.get("data", [])]
    if "openai" in providers:
        print("[init] OpenAI provider already registered, skipping.")
        return
    res = requests.post(f"{TF}/settings/model-providers", json={
        "manifest": {
            "type": "openai",
            "auth": {"api_key": API_KEY},
            "models": [{
                "model_id": "gpt-4o-mini",
                "name": "gpt-4o-mini",
                "properties": {"context_length": 128000, "max_output_tokens": 16000}
            }]
        }
    })
    if res.status_code in (200, 201):
        print("[init] OpenAI gpt-4o-mini provider registered.")
    else:
        print(f"[init] ERROR registering model provider: {res.status_code} {res.text[:200]}")
        sys.exit(1)

def register_mcp_server():
    existing = requests.get(f"{TF}/settings/mcp-servers").json()
    servers = [s["name"] for s in existing.get("data", [])]
    if "ripcord-chain" in servers:
        print("[init] ripcord-chain MCP server already registered, skipping.")
        return
    res = requests.post(f"{TF}/settings/mcp-servers", json={
        "manifest": {
            "type": "remote",
            "name": "ripcord-chain",
            "url": MCP_URL,
            "description": "On-chain MCP tools: get_vault_state, get_recent_txs, get_contract_source, simulate_pause, propose_pause"
        }
    })
    if res.status_code in (200, 201):
        print("[init] ripcord-chain MCP server registered.")
    else:
        print(f"[init] ERROR registering MCP server: {res.status_code} {res.text[:200]}")
        sys.exit(1)

def wait_for_mcp_tools():
    print("[init] Waiting for MCP tools to enumerate...")
    for _ in range(30):
        try:
            r = requests.get(f"{TF}/mcp-servers/ripcord-chain/tools", timeout=3)
            tools = r.json().get("data", [])
            if len(tools) >= 5:
                names = [t["name"] for t in tools]
                print(f"[init] MCP tools ready ({len(names)}): {names}")
                return
        except Exception:
            pass
        time.sleep(2)
    print("[init] WARNING: MCP tools not fully enumerated yet (proceeding anyway).")

def register_agent():
    existing = requests.get(f"{TF}/agents").json()
    agent = next((a for a in existing.get("data", []) if a["name"] == "ripcord"), None)

    manifest = {
        "model": {"name": "openai/gpt-4o-mini"},
        "instructions": (
            "You are the Ripcord Incident Commander, a specialized on-chain security agent.\n\n"
            "When a session starts:\n\n"
            "Phase 1 - Monitor: Call get_vault_state to inspect vault balance.\n\n"
            "Phase 2 - Investigation: Call get_recent_txs to identify drain source. "
            "Call get_contract_source to audit vault logic.\n\n"
            "Phase 3 - Sandbox: Call simulate_pause to fork the live chain and test "
            "mitigation in isolation. Confirm drainRateAfter is 0.00.\n\n"
            "Phase 4 - Propose: Call propose_pause with reason and simulationDigestId. "
            "This is approval-gated - wait for human ALLOW or DENY.\n\n"
            "Phase 5 - Confirm: After approval, output exactly one line: "
            "Vault secured. Circuit breaker activated.\n\n"
            "CRITICAL: Never output markdown, bullet lists, or long reports. "
            "Never execute on-chain pause without human approval."
        ),
        "mcp_servers": [{
            "name": "ripcord-chain",
            "enable_tools": ["@all"],
            "require_approval_for_tools": ["propose_pause"]
        }],
        "config": {"iteration_limit": 100}
    }

    if agent:
        # Update existing
        agent_id = agent["id"]
        res = requests.put(f"{TF}/agents/{agent_id}", json={"manifest": manifest})
        if res.status_code in (200, 201):
            print(f"[init] ripcord agent updated (id={agent_id}).")
        else:
            print(f"[init] ERROR updating agent: {res.status_code} {res.text[:200]}")
            sys.exit(1)
    else:
        # Create new
        res = requests.post(f"{TF}/agents", json={"name": "ripcord", "manifest": manifest})
        if res.status_code in (200, 201):
            created = res.json()["data"]
            print(f"[init] ripcord agent created (id={created['id']}).")
        else:
            print(f"[init] ERROR creating agent: {res.status_code} {res.text[:200]}")
            sys.exit(1)

def verify():
    agents = requests.get(f"{TF}/agents").json()
    agent = next((a for a in agents.get("data", []) if a["name"] == "ripcord"), None)
    if not agent:
        print("[init] FATAL: ripcord agent not found after registration!")
        sys.exit(1)
    m = agent["manifest"]
    model = m["model"]["name"]
    mcp_servers = [s["name"] for s in m.get("mcp_servers", [])]
    tools_res = requests.get(f"{TF}/mcp-servers/ripcord-chain/tools").json()
    tool_count = len(tools_res.get("data", []))
    print()
    print("[init] === VERIFICATION ===")
    print(f"[init] Agent:   ripcord (id={agent['id']})")
    print(f"[init] Model:   {model}")
    print(f"[init] MCP:     {mcp_servers}")
    print(f"[init] Tools:   {tool_count}/5 connected")
    if "gpt-4o-mini" not in model or "ripcord-chain" not in mcp_servers or tool_count < 5:
        print("[init] FAIL: Configuration incomplete!")
        sys.exit(1)
    print("[init] PASS: Ripcord is fully configured and ready.")

if __name__ == "__main__":
    wait_for_trueforge()
    register_model_provider()
    register_mcp_server()
    wait_for_mcp_tools()
    register_agent()
    verify()
