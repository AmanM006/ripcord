with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write('''\'use client\';
import { useEffect, useState } from \'react\';

export default function Home() {
  const [tvl, setTvl] = useState<string>(\'0\');
  const [paused, setPaused] = useState<boolean>(false);
  const [digestId, setDigestId] = useState<string | null>(null);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [simDigestData, setSimDigestData] = useState<any>(null);
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(\'/api/vault-state\');
        const data = await res.json();
        if (data.tvl) setTvl(data.tvl);
        if (data.paused !== undefined) setPaused(data.paused);
      } catch (err) {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const activeSession = localStorage.getItem(\'tf_active_session\');
    if (activeSession) {
      setSessionId(activeSession);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    
    const interval = setInterval(async () => {
      try {
        const sessRes = await fetch(`http://localhost:8790/api/v1/sessions/${sessionId}`);
        if (!sessRes.ok) return;
        
        const turnsRes = await fetch(`http://localhost:8790/api/v1/sessions/${sessionId}/turns`);
        const turns = await turnsRes.json();
        if (!turns.data || turns.data.length === 0) return;
        
        const latestTurn = turns.data[0];
        
        if (latestTurn.state && latestTurn.state.status === \'waiting_for_approval\') {
            setIsWaitingApproval(true);
        } else {
            setIsWaitingApproval(false);
        }

        const eventsRes = await fetch(`http://localhost:8790/api/v1/sessions/${sessionId}/turns/${latestTurn.id}/events`);
        const events = await eventsRes.json();
        
        if (events.data) {
          const logs: string[] = [];
          events.data.forEach((evt: any) => {
            if (evt.type === \'tool.call\') {
               logs.push(`Tool called: ${evt.tool_calls[0].function.name}`);
            } else if (evt.type === \'model.message\') {
               logs.push(`Agent: ${evt.content || \'Thinking...\'}`);
            } else if (evt.type === \'tool.response\') {
               logs.push(\'Tool returned.\');
               const match = evt.content.match(/<SIMULATION_DIGEST>([\\s\\S]*?)<\\/SIMULATION_DIGEST>/);
               if (match) {
                 try {
                   const parsed = JSON.parse(match[1]);
                   setSimDigestData(parsed);
                   setDigestId(parsed.simulationDigestId);
                 } catch (e) {}
               }
            }
          });
          setAgentLogs(logs);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleStartSession = async () => {
    try {
      const res = await fetch(\'http://localhost:8790/api/v1/sessions\', {
        method: \'POST\',
        headers: { \'Content-Type\': \'application/json\' },
        body: JSON.stringify({ agent: { name: \'ripcord\' } })
      });
      const data = await res.json();
      const newSessId = data.data.id;
      setSessionId(newSessId);
      localStorage.setItem(\'tf_active_session\', newSessId);
      
      await fetch(`http://localhost:8790/api/v1/sessions/${newSessId}/turns`, {
        method: \'POST\',
        headers: { \'Content-Type\': \'application/json\' },
        body: JSON.stringify({
          input: [{ type: \'user.message\', content: \'Investigate the vault right now. Call get_vault_state first, then get_recent_txs. Check if there is an active drain happening. Then simulate a pause.\' }],
          stream: false
        })
      });
    } catch (e) { console.error(e); }
  };

  const handleDecision = async (decision: \'APPROVE\' | \'DENY\') => {
    if (!digestId) return;
    
    if (sessionId && isWaitingApproval) {
        try {
            const turnsRes = await fetch(`http://localhost:8790/api/v1/sessions/${sessionId}/turns`);
            const turns = await turnsRes.json();
            const turnId = turns.data[0].id;
            
            await fetch(`http://localhost:8790/api/v1/sessions/${sessionId}/turns/${turnId}/resume`, {
                method: \'POST\',
                headers: { \'Content-Type\': \'application/json\' },
                body: JSON.stringify({
                    tool_approval: { decision: decision.toLowerCase() }
                })
            });
        } catch(e) {}
    }

    setDigestId(null);
    setSimDigestData(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-12 bg-gray-900 text-white gap-8">
      <div className="flex justify-between w-full max-w-6xl items-center">
        <div>
            <h1 className="text-5xl font-bold text-red-500 tracking-tight">Ripcord</h1>
            <p className="text-gray-400 text-lg">Simulation-First Approval Gate for On-Chain Incident Response</p>
        </div>
        <button 
          onClick={handleStartSession}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold shadow-lg"
        >
          START INVESTIGATION
        </button>
      </div>
      
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl text-center border border-gray-700">
        <h2 className="text-2xl mb-4 text-gray-300">Total Value Locked (TVL)</h2>
        <p className="text-6xl font-black text-green-400 mb-6 drop-shadow-md">
          {(Number(tvl) / 1e18).toFixed(2)} mUSD
        </p>
        <div className={`text-xl font-bold p-3 rounded uppercase tracking-widest ${paused ? \'bg-red-600 text-white\' : \'bg-green-600 text-white\'}`}>
          {paused ? \'Circuit Breaker: Paused\' : \'System: Active\'}
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 min-h-[400px] flex flex-col">
            <h3 className="text-xl mb-4 text-yellow-400 font-semibold border-b border-gray-700 pb-2">Agent Trace Stream</h3>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-sm">
              {!sessionId && <p className="text-gray-400 italic">No active session...</p>}
              {agentLogs.map((log, i) => (
                <div key={i} className="text-gray-300 border-l-2 border-gray-600 pl-2 py-1">
                  {log}
                </div>
              ))}
            </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border-2 border-red-500/50 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <h3 className="text-2xl mb-2 text-red-400 font-bold">Simulation Proof Digest</h3>
            
            {!simDigestData ? (
                <p className="text-gray-400 mb-8 text-center max-w-sm">Awaiting simulation results from sandbox...</p>
            ) : (
                <div className="bg-gray-900 p-6 rounded-lg w-full mb-8 space-y-4 border border-gray-700">
                  <div className="flex justify-between border-b border-gray-700 pb-2">
                    <span className="text-gray-400">Drain Rate Before:</span>
                    <span className="text-red-400 font-mono">{simDigestData.drainRateBefore} mUSD/block</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-700 pb-2">
                    <span className="text-gray-400">Drain Rate After Fix:</span>
                    <span className="text-green-400 font-mono">{simDigestData.drainRateAfter} mUSD/block</span>
                  </div>
                  <div className="text-sm text-gray-500 pt-2 font-mono">
                    {simDigestData.message} (Fork Block: {simDigestData.forkBlockNumber})
                  </div>
                </div>
            )}

            <div className={`flex gap-4 w-full px-8 transition-opacity ${digestId && isWaitingApproval ? \'opacity-100\' : \'opacity-50 pointer-events-none\'}`}>
              <button onClick={() => handleDecision(\'APPROVE\')} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg text-lg transition-colors shadow-lg">
                ALLOW
              </button>
              <button onClick={() => handleDecision(\'DENY\')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg text-lg transition-colors shadow-lg">
                DENY
              </button>
            </div>
        </div>
      </div>
    </main>
  );
}''')
