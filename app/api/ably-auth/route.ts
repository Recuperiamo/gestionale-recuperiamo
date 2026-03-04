// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  // Vercel: usa ABLY_API_KEY server-side (senza NEXT_PUBLIC_)
  // Fallback a NEXT_PUBLIC_ per compatibilità locale
  const apiKey = process.env.ABLY_API_KEY || process.env.NEXT_PUBLIC_ABLY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Ably API key not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    apiKey,
    timestamp: Date.now()
  });
}
