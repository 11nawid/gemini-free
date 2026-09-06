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
  const models = Object.entries(MODELS).map(([n, c]) => ({
    name: `models/${n}`,
    displayName: n,
    description: c.desc,
    supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
  }));

  return NextResponse.json({ models }, { headers });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}
