import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { simulationDigestId, decision, approverNote } = body;
    
    // Fallback logic
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const record = {
      timestamp: new Date().toISOString(),
      decision,
      simulation_digest: { id: simulationDigestId },
      approver_note: approverNote || 'Approved via dashboard'
    };

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('ripcord_audit_log').insert([record]);
      if (error) {
        console.error("Supabase error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    } else {
      // Fallback to local JSON file
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dataPath = path.join(dataDir, 'audit-log.json');
      let logs = [];
      if (fs.existsSync(dataPath)) {
        logs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      }
      logs.push({ id: Date.now(), ...record });
      fs.writeFileSync(dataPath, JSON.stringify(logs, null, 2));
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
