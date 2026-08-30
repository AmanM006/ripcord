import re

with open('dashboard/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add cursor-pointer and click effects to Start Investigation button
old_btn = """className="bg-zinc-100 text-black hover:bg-white px-5 py-2 rounded-md font-medium text-sm transition-colors shadow-sm\""""
new_btn = """className="bg-zinc-100 text-black hover:bg-white px-5 py-2 rounded-md font-medium text-sm transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50\""""
content = content.replace(old_btn, new_btn)

# Disable the button if session is already running
content = content.replace("onClick={handleStartSession}", "onClick={handleStartSession} disabled={!!sessionId && !isWaitingApproval}")

# 2. Fix 100vh Layout
content = content.replace("className=\"min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-500/30\"", "className=\"h-screen overflow-hidden flex flex-col bg-black text-zinc-100 font-sans selection:bg-red-500/30\"")
content = content.replace("className=\"p-8 max-w-7xl mx-auto flex flex-col gap-8\"", "className=\"flex-1 overflow-hidden p-6 max-w-7xl w-full mx-auto flex flex-col gap-6\"")
content = content.replace("className=\"grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]\"", "className=\"flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6\"")

# 3. Add visual cue for Agent Running
# We have a line: <h3 className="text-sm font-semibold text-zinc-300">Agent Trace Stream</h3>
# Let's add a pulsating "Analyzing..." if running
old_trace_header = """<h3 className="text-sm font-semibold text-zinc-300">Agent Trace Stream</h3>"""
new_trace_header = """<div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-zinc-300">Agent Trace Stream</h3>
                {sessionId && !isWaitingApproval && !simDigestData && (
                  <span className="flex items-center gap-2 text-xs text-blue-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
                    Executing Sub-Agents...
                  </span>
                )}
              </div>"""
content = content.replace(old_trace_header, new_trace_header)

with open('dashboard/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("UI patched successfully")
