import re

with open('dashboard/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'return\s*\(\s*<main', content)
if not match:
    print("Could not find main return block")
    exit(1)

logic_part = content[:match.start()]

new_render = """return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-900 bg-[#050505]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Ripcord <span className="text-zinc-600 font-normal">| Incident Command</span></h1>
        </div>
        <button 
          onClick={handleStartSession}
          className="bg-zinc-100 text-black hover:bg-white px-5 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
        >
          Start Investigation
        </button>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3 bg-[#0a0a0a] border border-zinc-900 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">Vault Total Value Locked</p>
              <p className="text-4xl font-mono text-zinc-100">
                {(Number(tvl) / 1e18).toFixed(2)} <span className="text-zinc-600 text-2xl">mUSD</span>
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">System Status</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${paused ? 'bg-red-950/50 text-red-500 border border-red-900/50' : 'bg-emerald-950/50 text-emerald-500 border border-emerald-900/50'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                {paused ? 'Circuit Breaker Active' : 'Operational'}
              </div>
            </div>
          </div>
        </div>

        {/* Console & Approval Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
          
          {/* Trace Console */}
          <div className="bg-[#0a0a0a] border border-zinc-900 rounded-xl flex flex-col overflow-hidden">
            <div className="border-b border-zinc-900 px-5 py-4 bg-[#050505] flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-300">Agent Trace Stream</h3>
              <span className="text-xs font-mono text-zinc-600">ID: {sessionId ? sessionId.substring(0,8) + '...' : 'NONE'}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 font-mono text-xs text-zinc-400 space-y-3 bg-[#0a0a0a]">
              {!sessionId && <p className="text-zinc-600 italic">Standing by...</p>}
              {agentLogs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start border-l-2 border-zinc-800 pl-3 py-1">
                  <span className={log.startsWith('Tool called:') ? 'text-blue-400' : log.startsWith('Tool returned') ? 'text-emerald-500' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Gate */}
          <div className="bg-[#0a0a0a] border border-zinc-900 rounded-xl flex flex-col overflow-hidden relative">
            {(digestId && isWaitingApproval) && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>
            )}
            <div className="border-b border-zinc-900 px-5 py-4 bg-[#050505] flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-300">Simulation Proof Digest</h3>
              {isWaitingApproval && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
            </div>
            
            <div className="flex-1 p-6 flex flex-col justify-center relative">
              {!simDigestData ? (
                  <div className="text-center absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-zinc-500 text-sm">Awaiting simulation results from sandbox...</p>
                  </div>
              ) : (
                  <div className="space-y-6 w-full max-w-sm mx-auto">
                    <div className="bg-[#111] border border-zinc-800 rounded-lg p-5 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Drain Rate Before</span>
                        <span className="text-red-400 font-mono text-base">{simDigestData.drainRateBefore} <span className="text-xs text-red-400/50">mUSD/block</span></span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Drain Rate After Fix</span>
                        <span className="text-emerald-400 font-mono text-base">{simDigestData.drainRateAfter} <span className="text-xs text-emerald-400/50">mUSD/block</span></span>
                      </div>
                      <div className="pt-1">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Sandbox Verification</span>
                        <span className="text-sm text-zinc-300 block leading-relaxed">{simDigestData.message}</span>
                        <div className="text-[10px] text-zinc-600 font-mono mt-2 uppercase">Fork Block: {simDigestData.forkBlockNumber}</div>
                      </div>
                    </div>

                    <div className={`flex gap-3 transition-opacity duration-300 ${digestId && isWaitingApproval ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                      <button onClick={() => handleDecision('DENY')} className="flex-1 bg-[#111] hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium py-2.5 rounded-md text-sm transition-colors">
                        Deny Action
                      </button>
                      <button onClick={() => handleDecision('APPROVE')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2.5 rounded-md text-sm transition-colors shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        Authorize Pause
                      </button>
                    </div>
                  </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
"""

with open('dashboard/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(logic_part + new_render)
