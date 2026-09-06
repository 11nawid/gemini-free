export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { MODELS } from '@/lib/models';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true',
};

export async function GET(req: Request) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const data = Object.entries(MODELS).map(([n, c]) => ({
    id: n,
    object: 'model',
    created: 1700000000,
    owned_by: 'google',
    description: c.desc,
  }));

  return NextResponse.json({ object: 'list', data }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
