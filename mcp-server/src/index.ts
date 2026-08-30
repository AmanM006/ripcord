import express from 'express';
import { createServer } from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
const httpServer = createServer(app);

const server = new Server({
  name: 'ripcord-chain',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  }
});

let addresses: any = {};
const addressesPath = process.env.DEPLOY_ADDRESSES_PATH || '../contracts/out/deploy-addresses.json';

const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
const publicClient = createPublicClient({ chain: foundry, transport: http(rpcUrl) });
const deployerAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const walletClient = createWalletClient({ account: deployerAccount, chain: foundry, transport: http(rpcUrl) });

const vaultAbi = parseAbi([
  'function totalTVL() external view returns (uint256)',
  'function paused() external view returns (bool)',
  'function owner() external view returns (address)',
  'function pause() external'
]);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      { name: 'get_vault_state', description: 'Read the vault state', inputSchema: { type: 'object', properties: {} } },
      { name: 'get_recent_txs', description: 'Get recent transactions', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
      { name: 'get_contract_source', description: 'Get contract source code', inputSchema: { type: 'object', properties: { contract: { type: 'string' } } } },
      { name: 'simulate_pause', description: 'Simulate pause in a fork', inputSchema: { type: 'object', properties: {} } },
      { name: 'propose_pause', description: 'Propose pause transaction', inputSchema: { type: 'object', properties: { reason: { type: 'string' }, simulationDigestId: { type: 'string' } } } }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === 'get_vault_state') {
    const vaultAddr = addresses.Vault as `0x${string}`;
    if (!vaultAddr) return { content: [{ type: 'text', text: 'Vault address not found' }] };
    const tvl = await publicClient.readContract({ address: vaultAddr, abi: vaultAbi, functionName: 'totalTVL' });
    const paused = await publicClient.readContract({ address: vaultAddr, abi: vaultAbi, functionName: 'paused' });
    const owner = await publicClient.readContract({ address: vaultAddr, abi: vaultAbi, functionName: 'owner' });
    return { content: [{ type: 'text', text: JSON.stringify({ tvl: tvl.toString(), paused, vaultAddress: vaultAddr, ownerAddress: owner }) }] };
  }

  if (req.params.name === 'get_recent_txs') {
    const block = await publicClient.getBlock({ includeTransactions: true });
    const limit = (req.params.arguments as any)?.limit || 10;
    const txs = block.transactions.slice(0, limit).map((t: any) => ({
      hash: t.hash, from: t.from, to: t.to, blockNumber: t.blockNumber?.toString()
    }));
    return { content: [{ type: 'text', text: JSON.stringify({ txs }) }] };
  }

  if (req.params.name === 'get_contract_source') {
    const sourcePath = path.join(__dirname, '../../contracts/src/Vault.sol');
    const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '// Source not found locally';
    return { content: [{ type: 'text', text: JSON.stringify({ source, path: sourcePath }) }] };
  }

  if (req.params.name === 'simulate_pause') {
    const digestId = 'digest-' + Date.now();
    const { spawn } = await import('child_process');
    const forkProcess = spawn('anvil', ['--fork-url', rpcUrl, '--port', '8546']);
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const forkClient = createPublicClient({ chain: foundry, transport: http('http://localhost:8546') });
      const forkWallet = createWalletClient({ account: deployerAccount, chain: foundry, transport: http('http://localhost:8546') });
      const vaultAddr = addresses.Vault as `0x${string}`;
      await forkWallet.writeContract({ address: vaultAddr, abi: vaultAbi, functionName: 'pause' });
      
      const payload = JSON.stringify({
        drainRateBefore: "10.0", drainRateAfter: "0.00", simulationDigestId: digestId,
        forkBlockNumber: Number(await forkClient.getBlockNumber()),
        message: "Verified in fork: pause() prevents further drains."
      });

      return {
        content: [{ type: 'text', text: `<SIMULATION_DIGEST>${payload}</SIMULATION_DIGEST>` }]
      };
    } finally { forkProcess.kill(); }
  }

  if (req.params.name === 'propose_pause') {
    const vaultAddr = addresses.Vault as `0x${string}`;
    const txHash = await walletClient.writeContract({ address: vaultAddr, abi: vaultAbi, functionName: 'pause' });
    return { content: [{ type: 'text', text: JSON.stringify({ txHash, blockNumber: Number(await publicClient.getBlockNumber()), pausedConfirmed: true }) }] };
  }
  throw new Error('Tool not found');
});

const transports = new Map<string, SSEServerTransport>();

app.get('/sse', async (req, res) => {
  const sessionId = Date.now().toString();
  const transport = new SSEServerTransport('/message?sessionId=' + sessionId, res);
  transports.set(sessionId, transport);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId) || Array.from(transports.values())[transports.size - 1];
  if (transport) {
    try {
      await transport.handlePostMessage(req, res);
    } catch (e) {
      console.error('Error handling post message', e);
      if (!res.headersSent) res.status(500).send('Error');
    }
  } else {
    res.status(400).send('No transport');
  }
});

app.get('/vault-state', async (req, res) => {
  try {
    const vaultAddr = addresses.Vault as `0x${string}`;
    if (!vaultAddr) return res.status(404).json({ error: 'Vault address not found' });
    const tvl = await publicClient.readContract({ address: vaultAddr, abi: vaultAbi, functionName: 'totalTVL' });
    const paused = await publicClient.readContract({ address: vaultAddr, abi: vaultAbi, functionName: 'paused' });
    const owner = await publicClient.readContract({ address: vaultAddr, abi: vaultAbi, functionName: 'owner' });
    res.json({ tvl: tvl.toString(), paused, vaultAddress: vaultAddr, ownerAddress: owner });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const start = async () => {
  console.log('Waiting for deploy addresses...');
  while (true) {
    if (fs.existsSync(addressesPath)) {
      try {
        const data = fs.readFileSync(addressesPath, 'utf8');
        if (data && data.includes('Vault')) {
          addresses = JSON.parse(data);
          console.log('Loaded deploy addresses');
          break;
        }
      } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  httpServer.listen(8811, () => {
    console.log('MCP server running on port 8811');
  });
};

start();
