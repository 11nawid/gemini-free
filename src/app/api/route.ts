export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MODELS } from '@/lib/models';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true'
};

export async function GET() {
  return NextResponse.json(
    { status: 'ok', version: '1.1.0', models: Object.keys(MODELS) },
    { headers }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}
