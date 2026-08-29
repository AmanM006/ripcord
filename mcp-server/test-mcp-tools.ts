import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function testTools() {
  const transport = new SSEClientTransport(new URL('http://localhost:8811/sse'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  
  await client.connect(transport);
  
  console.log("Connected to MCP Server!");
  
  const tools = await client.listTools();
  console.log("Available tools:", tools.tools.map(t => t.name));
  
  // Test get_vault_state
  console.log("\n--- Testing get_vault_state ---");
  const vaultState = await client.callTool({ name: 'get_vault_state', arguments: {} });
  console.log(vaultState);

  // Test get_recent_txs
  console.log("\n--- Testing get_recent_txs ---");
  const recentTxs = await client.callTool({ name: 'get_recent_txs', arguments: {} });
  console.log(recentTxs);

  // Test get_contract_source
  console.log("\n--- Testing get_contract_source ---");
  const source = await client.callTool({ name: 'get_contract_source', arguments: {} });
  console.log(source);

  // Test simulate_pause
  console.log("\n--- Testing simulate_pause ---");
  const simulation = await client.callTool({ name: 'simulate_pause', arguments: {} });
  console.log(simulation);

  // Test propose_pause
  console.log("\n--- Testing propose_pause ---");
  const propose = await client.callTool({ name: 'propose_pause', arguments: { simulationDigestId: 'mock-id', reasoning: 'test' } });
  console.log(propose);

  process.exit(0);
}

testTools().catch(console.error);
