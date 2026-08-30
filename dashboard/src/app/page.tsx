'use client';
import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const [tvl, setTvl] = useState<string | null>(null);
  const [paused, setPaused] = useState<boolean>(false);
  const [digestId, setDigestId] = useState<string | null>(null);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<{type: string, msg: string}[]>([]);
  const [simDigestData, setSimDigestData] = useState<any>(null);
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [isSessionDone, setIsSessionDone] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isError, setIsError] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Poll vault state — only update TVL if the chain returns a valid positive value
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/vault-state');
        const data = await res.json();
        if (data.tvl !== undefined) {
          // Only update display if value is non-zero AND decreasing
          // This hides the brief +10 spike from setupDeposit between drain cycles
          if (data.tvl !== '0' && data.tvl !== '') {
            setTvl(prev => {
              if (prev === null) return data.tvl;
              // Never show an increase — hold last value if attacker re-deposits briefly
              return parseFloat(data.tvl) <= parseFloat(prev) ? data.tvl : prev;
            });
          }
        }
        if (data.paused !== undefined) setPaused(data.paused);
      } catch (err) {}
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [agentLogs]);

  // Poll session events
  useEffect(() => {
    if (!sessionId) return;
    
    const interval = setInterval(async () => {
      try {
        const sessRes = await fetch(`/tf-api/sessions/${sessionId}`);
        if (!sessRes.ok) return;
        
        const turnsRes = await fetch(`/tf-api/sessions/${sessionId}/turns`);
        const turns = await turnsRes.json();
        if (!turns.data || turns.data.length === 0) return;
        
        const latestTurn = turns.data[turns.data.length - 1];
        
        // Handle Error State
        if (latestTurn.state?.status === 'error') {
            setIsError(true);
            setAgentLogs(prev => {
                const logs = [...prev];
                const errMsg = latestTurn.state.message || 'Unknown error';
                if (!logs.find(l => l.msg === errMsg)) {
                    logs.push({type: 'error', msg: errMsg});
                }
                return logs;
            });
            return; // Stop processing further if error
        }

        // Check approval requirement in TrueForge TurnState
        const reqActions = latestTurn.state?.required_actions || [];
        const hasApprovalReq = reqActions.some((a: any) => a.type === 'tool.approval_required') || latestTurn.state?.status === 'waiting_for_approval';
        setIsWaitingApproval(hasApprovalReq);
        setIsSessionDone(latestTurn.state?.status === 'done' && !hasApprovalReq);

        const eventsRes = await fetch(`/tf-api/sessions/${sessionId}/turns/${latestTurn.id}/events`);
        const events = await eventsRes.json();
        
        if (events.data) {
          const logs: {type: string, msg: string}[] = [
            {type: 'info', msg: '🚀 INITIALIZING RIPCORD INCIDENT COMMANDER...'},
            {type: 'warning', msg: '⚠️ ALERT: Anomalous vault outflow signature detected. Engaging incident response protocol.'}
          ];
          events.data.forEach((evt: any) => {
            if (evt.tool_calls || evt.type === 'tool.call') {
               const toolCalls = evt.tool_calls || [];
               toolCalls.forEach((tc: any) => {
                 const toolName = tc.function?.name || tc.name || 'tool';
                 const toolMsgMap: any = {
                   'get_vault_state': '📡 Interrogating live Anvil node for Vault TVL telemetry...',
                   'get_recent_txs': '🔍 Origin Tracer: Scanning mempool for anomaly signatures...',
                   'get_contract_source': '📜 Contract Auditor: Extracting Vault bytecode & logic...',
                   'simulate_pause': '⚡ Sandboxing: Spawning isolated chain fork to simulate mitigation...',
                   'propose_pause': '🛡️ Generating cryptographic Proof Digest for human authorization...'
                 };
                 const msg = toolMsgMap[toolName] || `⚙️ Tool Call: ${toolName}`;
                 logs.push({type: 'tool', msg});
               });
            }
            if (evt.type === 'model.message' && evt.content) {
               logs.push({type: 'agent', msg: `🤖 Agent: ${evt.content}`});
            } else if (evt.type === 'tool.response') {
               logs.push({type: 'success', msg: '✅ Sub-process resolved successfully.'});
               const text = typeof evt.content === 'string' ? evt.content : JSON.stringify(evt.content || '');
               const match = text.match(/<SIMULATION_DIGEST>([\s\S]*?)<\/SIMULATION_DIGEST>/);
               if (match) {
                 try {
                   const parsed = JSON.parse(match[1]);
                   setSimDigestData(parsed);
                   setDigestId(parsed.simulationDigestId);
                 } catch (e) {}
               }
            } else if (evt.type === 'tool.approval_required') {
               logs.push({type: 'warning', msg: '⏸️ Human Approval Required for propose_pause().'});
            }
          });
          setAgentLogs(logs);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleStartSession = async () => {
    try {
      setIsStarting(true);
      setIsError(false);
      setAgentLogs([
        {type: 'info', msg: '🚀 INITIALIZING RIPCORD INCIDENT COMMANDER...'},
        {type: 'warning', msg: '⚠️ ALERT: Anomalous vault outflow signature detected. Engaging incident response protocol.'}
      ]);
      setSimDigestData(null);
      setDigestId(null);
      setDecisionMade(null);
      setIsSessionDone(false);
      
      const res = await fetch('/tf-api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: { name: 'ripcord' } })
      });
      const data = await res.json();
      const newSessId = data.data.id;
      setSessionId(newSessId);
      
      await fetch(`/tf-api/sessions/${newSessId}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: [{ type: 'user.message', content: 'Investigate the vault right now. Check vault state, check recent txs, simulate pause in sandbox, and propose pause.' }],
          stream: false
        })
      });
    } catch (e) { 
      console.error(e); 
    } finally {
      setIsStarting(false);
    }
  };

  const [decisionMade, setDecisionMade] = useState<'APPROVE'|'DENY'|null>(null);

  const handleDecision = async (decision: 'APPROVE' | 'DENY') => {
    setDecisionMade(decision);
    // 1. Trigger local contract call
    try {
      if (decision === 'APPROVE') {
        await fetch('/api/approve', { method: 'POST' });
      } else {
        await fetch('/api/deny', { method: 'POST' });
      }
    } catch (e) {}

    // 2. Resume TrueForge session
    if (sessionId) {
      try {
        const turnsRes = await fetch(`/tf-api/sessions/${sessionId}/turns`);
        const turns = await turnsRes.json();
        const latestTurn = turns.data?.[turns.data.length - 1];
        const approvalAction = latestTurn?.state?.required_actions?.find((a: any) => a.type === 'tool.approval_required');
        
        if (approvalAction && approvalAction.tool_calls?.length > 0) {
          const tc = approvalAction.tool_calls[0];
          await fetch(`/tf-api/sessions/${sessionId}/turns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: [{
                type: 'user.tool_approval',
                thread_id: approvalAction.thread_id,
                tool_call_id: tc.id,
                approval: { status: decision === 'APPROVE' ? 'allow' : 'deny' }
              }],
              previous_turn_id: latestTurn.id,
              stream: false
            })
          });
        }
      } catch(e) {}
    }

    setIsWaitingApproval(false);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-black text-zinc-100 font-sans selection:bg-red-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-1.5 border-b border-zinc-900 bg-[#050505] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">Ripcord <span className="text-zinc-600 font-normal">| Incident Command</span></h1>
        </div>
        <button 
          onClick={handleStartSession} 
          disabled={isStarting}
          className="bg-zinc-100 text-black hover:bg-white px-4 py-1.5 rounded-md font-medium text-xs transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {isStarting ? 'Starting...' : 'Start Investigation'}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-2 max-w-7xl w-full mx-auto flex flex-col gap-2">
        
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-shrink-0">
          <div className="md:col-span-3 bg-[#0a0a0a] border border-zinc-900 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-0.5">Vault Total Value Locked</p>
               <p className="text-2xl font-mono text-zinc-100 leading-none">
                {tvl === null
                  ? <span className="text-zinc-600 text-base animate-pulse">Reading chain...</span>
                  : <>{(Number(tvl) / 1e18).toFixed(2)} <span className="text-zinc-600 text-lg">mUSD</span></>
                }
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-0.5">System Status</p>
              <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${paused ? 'bg-red-950/50 text-red-500 border border-red-900/50' : 'bg-emerald-950/50 text-emerald-500 border border-emerald-900/50'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                {paused ? 'Circuit Breaker Active' : 'Operational'}
              </div>
            </div>
          </div>
        </div>

        {/* Agent Network Topology Visual */}
        <div className="bg-[#0a0a0a] border border-zinc-900 rounded-xl p-3 flex flex-col overflow-hidden relative flex-shrink-0">
          <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Agent Sub-Network Topology</h3>
          <div className="flex items-center justify-between w-full relative px-8">
            {/* Connecting Line */}
            <div className="absolute top-4 left-12 right-12 h-0.5 bg-zinc-800 z-0">
              <div className="h-full bg-blue-500 transition-all duration-1000 ease-in-out" 
                   style={{ width: `${Math.min(100, (agentLogs.filter(l => l.type === 'tool').length / 5) * 100)}%` }}>
              </div>
            </div>
            
            {/* Nodes */}
            {[
              { id: 'monitor', label: 'Monitor', icon: '📡', search: 'Vault TVL' },
              { id: 'tracer', label: 'Tracer', icon: '🔍', search: 'Origin Tracer' },
              { id: 'auditor', label: 'Auditor', icon: '📜', search: 'Contract Auditor' },
              { id: 'sandbox', label: 'Sandbox', icon: '⚡', search: 'Sandboxing' },
              { id: 'crypto', label: 'Gateway', icon: '🛡️', search: 'cryptographic Proof' }
            ].map((node) => {
              const isActive = agentLogs.some(l => l.msg.includes(node.search));
              return (
                <div key={node.id} className="relative z-10 flex flex-col items-center gap-1 w-12">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm transition-all duration-500
                    ${isActive ? 'bg-blue-950/80 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' : 'bg-zinc-950 border-zinc-800 opacity-50 grayscale'}`}>
                    {node.icon}
                  </div>
                  <span className={`text-[8px] uppercase font-bold tracking-widest text-center transition-colors duration-500 ${isActive ? 'text-blue-400' : 'text-zinc-600'}`}>
                    {node.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Console & Approval Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Trace Console */}
          <div className="bg-[#0a0a0a] border border-zinc-900 rounded-xl flex flex-col overflow-hidden relative">
            <div className="border-b border-zinc-900 px-5 py-3.5 bg-[#050505] flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-zinc-300">Agent Trace Stream</h3>
                {sessionId && !isWaitingApproval && !isError && !isSessionDone && (
                  <span className="flex items-center gap-2 text-xs text-blue-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
                    Executing Sub-Agents...
                  </span>
                )}
                {isSessionDone && (
                  <span className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    Investigation Concluded
                  </span>
                )}
                {isWaitingApproval && (
                  <span className="flex items-center gap-2 text-xs text-amber-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    Awaiting Approval
                  </span>
                )}
                {isError && (
                  <span className="flex items-center gap-2 text-xs text-red-400 font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    SYSTEM ERROR
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-zinc-600">ID: {sessionId ? sessionId.substring(0,8) + '...' : 'NONE'}</span>
            </div>
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-5 font-mono text-xs text-zinc-400 space-y-3 bg-[#0a0a0a]">
              {!sessionId && <p className="text-zinc-600 italic">Standing by...</p>}
              {agentLogs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start border-l-2 border-zinc-800 pl-3 py-1">
                  <span className={log.type === 'error' ? 'text-red-500 font-bold' : log.type === 'tool' ? 'text-blue-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400 font-semibold' : 'text-zinc-300'}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Gate */}
          <div className="bg-[#0a0a0a] border border-zinc-900 rounded-xl flex flex-col overflow-hidden relative">
            {isWaitingApproval && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500 animate-pulse"></div>
            )}
            <div className="border-b border-zinc-900 px-5 py-3.5 bg-[#050505] flex justify-between items-center flex-shrink-0">
              <h3 className="text-sm font-semibold text-zinc-300">Simulation Proof Digest</h3>
              {isWaitingApproval && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
            </div>
            
            <div className="flex-1 p-6 flex flex-col justify-center relative overflow-y-auto">
              {!simDigestData ? (
                  <div className="text-center flex flex-col items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-zinc-500 text-sm">Awaiting simulation results from sandbox...</p>
                  </div>
              ) : (
                  <div className="space-y-6 w-full max-w-md mx-auto">
                    <div className="bg-[#111] border border-zinc-800 rounded-lg p-5 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Drain Rate Before</span>
                        <span className="text-red-400 font-mono text-base font-semibold">{simDigestData.drainRateBefore} <span className="text-xs text-red-400/50">mUSD/block</span></span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Drain Rate After Fix</span>
                        <span className="text-emerald-400 font-mono text-base font-semibold">{simDigestData.drainRateAfter} <span className="text-xs text-emerald-400/50">mUSD/block</span></span>
                      </div>
                      <div className="pt-1">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Sandbox Verification</span>
                        <span className="text-sm text-zinc-300 block leading-relaxed">{simDigestData.message}</span>
                        <div className="text-[10px] text-zinc-600 font-mono mt-2 uppercase">Fork Block: #{simDigestData.forkBlockNumber}</div>
                      </div>
                    </div>

                    {decisionMade ? (
                      <div className="flex gap-3">
                        <button disabled className={`flex-1 font-medium py-2.5 rounded-md text-sm transition-colors cursor-not-allowed ${decisionMade === 'APPROVE' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                          {decisionMade === 'APPROVE' ? '✅ Action Authorized' : '❌ Action Denied'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => handleDecision('DENY')} className="flex-1 bg-[#111] hover:bg-red-950 border border-red-900/50 text-red-400 font-medium py-2.5 rounded-md text-sm transition-colors cursor-pointer active:scale-95">
                          Deny
                        </button>
                        <button onClick={() => handleDecision('APPROVE')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-md text-sm transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer active:scale-95">
                          ✅ Authorize Pause
                        </button>
                      </div>
                    )}
                  </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
