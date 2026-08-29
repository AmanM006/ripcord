'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [tvl, setTvl] = useState<string>('0');
  const [paused, setPaused] = useState<boolean>(false);
  const [digestId, setDigestId] = useState<string | null>(null);

  const handleDecision = async (decision: 'APPROVE' | 'DENY') => {
    if (!digestId) return;
    await fetch(`/api/` + decision.toLowerCase(), {
      method: 'POST',
      body: JSON.stringify({ simulationDigestId: digestId, decision })
    });
    setDigestId(null);
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/vault-state');
        const data = await res.json();
        if (data.tvl) setTvl(data.tvl);
        if (data.paused !== undefined) setPaused(data.paused);
      } catch (err) {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-12 bg-gray-900 text-white gap-8">
      <h1 className="text-5xl font-bold text-red-500 tracking-tight">Ripcord</h1>
      <p className="text-gray-400 text-lg">Simulation-First Approval Gate for On-Chain Incident Response</p>
      
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl text-center border border-gray-700">
        <h2 className="text-2xl mb-4 text-gray-300">Total Value Locked (TVL)</h2>
        <p className="text-6xl font-black text-green-400 mb-6 drop-shadow-md">
          {(Number(tvl) / 1e18).toFixed(2)} mUSD
        </p>
        <div className={`text-xl font-bold p-3 rounded uppercase tracking-widest ${paused ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {paused ? 'Circuit Breaker: Paused' : 'System: Active'}
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 min-h-[400px] flex flex-col">
            <h3 className="text-xl mb-4 text-yellow-400 font-semibold border-b border-gray-700 pb-2">Agent Trace Stream</h3>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-sm">
              <p className="text-gray-400 italic">Listening for TrueForge session events...</p>
              {/* Agent traces will stream here */}
            </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border-2 border-red-500/50 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <h3 className="text-2xl mb-2 text-red-400 font-bold">Simulation Proof Digest</h3>
            <p className="text-gray-400 mb-8 text-center max-w-sm">Awaiting simulation results from sandbox...</p>
            
            <div className="bg-gray-900 p-6 rounded-lg w-full mb-8 space-y-4 border border-gray-700 opacity-50">
              <div className="flex justify-between border-b border-gray-700 pb-2">
                <span className="text-gray-400">Drain Rate Before:</span>
                <span className="text-red-400 font-mono">10.00 mUSD/block</span>
              </div>
              <div className="flex justify-between border-b border-gray-700 pb-2">
                <span className="text-gray-400">Drain Rate After Fix:</span>
                <span className="text-green-400 font-mono">0.00 mUSD/block</span>
              </div>
              <div className="text-sm text-gray-500 pt-2 font-mono">
                Proposed Action: execute pause() on Vault
              </div>
            </div>

            <div className={`flex gap-4 w-full px-8 transition-opacity ${digestId ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <button onClick={() => handleDecision('APPROVE')} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg text-lg transition-colors shadow-lg">
                ALLOW
              </button>
              <button onClick={() => handleDecision('DENY')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg text-lg transition-colors shadow-lg">
                DENY
              </button>
            </div>
        </div>
      </div>
    </main>
  );
}
