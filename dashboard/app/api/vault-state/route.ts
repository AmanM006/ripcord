import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_MCP_URL || 'http://localhost:8811';
    const res = await fetch(`${url}/vault-state`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
