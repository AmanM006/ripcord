import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { simulationDigestId, decision, approverNote } = body;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const record = {
      timestamp: new Date().toISOString(),
      decision: 'DENY',
      simulation_digest: { id: simulationDigestId },
      approver_note: approverNote || 'Denied via dashboard'
    };

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('ripcord_audit_log').insert([record]);
    } else {
      const dataPath = path.join(process.cwd(), 'data', 'audit-log.json');
      let logs = [];
      if (fs.existsSync(dataPath)) {
        logs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      }
      logs.push({ id: Date.now(), ...record });
      fs.writeFileSync(dataPath, JSON.stringify(logs, null, 2));
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
