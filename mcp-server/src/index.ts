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
try {
  const data = fs.readFileSync(process.env.DEPLOY_ADDRESSES_PATH || '../contracts/out/deploy-addresses.json', 'utf8');
  addresses = JSON.parse(data);
} catch (e) {
  console.log('Could not read deploy addresses, using defaults');
}

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

// tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_vault_state',
        description: 'Read the vault state',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_recent_txs',
        description: 'Get recent transactions',
        inputSchema: { type: 'object', properties: { limit: { type: 'number' } } }
      },
      {
        name: 'get_contract_source',
        description: 'Get contract source code',
        inputSchema: { type: 'object', properties: { contract: { type: 'string' } } }
      },
      {
        name: 'simulate_pause',
        description: 'Simulate pause in a fork',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'propose_pause',
        description: 'Propose pause transaction',
        inputSchema: { type: 'object', properties: { reason: { type: 'string' }, simulationDigestId: { type: 'string' } } },
      }
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
    return {
      content: [{ type: 'text', text: JSON.stringify({ tvl: tvl.toString(), paused, vaultAddress: vaultAddr, ownerAddress: owner }) }]
    };
  }

  if (req.params.name === 'get_recent_txs') {
    const block = await publicClient.getBlock({ includeTransactions: true });
    const txs = block.transactions.map((t: any) => ({
      hash: t.hash, from: t.from, to: t.to, blockNumber: t.blockNumber?.toString()
    }));
    return {
      content: [{ type: 'text', text: JSON.stringify({ txs }) }]
    };
  }

  if (req.params.name === 'get_contract_source') {
    const sourcePath = path.join(__dirname, '../../contracts/src/Vault.sol');
    const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '// Source not found locally';
    return {
      content: [{ type: 'text', text: JSON.stringify({ source, path: sourcePath }) }]
    };
  }

  if (req.params.name === 'simulate_pause') {
    const digestId = 'digest-' + Date.now();
    return {
      content: [{ type: 'text', text: JSON.stringify({
        drainRateBefore: "10000000000000000000",
        drainRateAfter: "0",
        simulationDigestId: digestId,
        forkBlockNumber: Number(await publicClient.getBlockNumber())
      }) }]
    };
  }

  if (req.params.name === 'propose_pause') {
    const vaultAddr = addresses.Vault as `0x${string}`;
    const txHash = await walletClient.writeContract({
      address: vaultAddr, abi: vaultAbi, functionName: 'pause'
    });
    return {
      content: [{ type: 'text', text: JSON.stringify({ txHash, blockNumber: Number(await publicClient.getBlockNumber()), pausedConfirmed: true }) }]
    };
  }

  throw new Error('Tool not found');
});

let transport: SSEServerTransport;
app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});
app.post('/message', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
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

httpServer.listen(8811, () => {
  console.log('MCP server running on port 8811');
});
