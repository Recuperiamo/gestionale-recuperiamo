import { NextResponse } from 'next/server';

export async function GET() {
  // Vercel: usa ABLY_API_KEY server-side (senza NEXT_PUBLIC_)
  // Fallback a NEXT_PUBLIC_ per compatibilità locale
  const apiKey = process.env.ABLY_API_KEY || process.env.NEXT_PUBLIC_ABLY_API_KEY;
  
  console.log('[Ably Auth API] Environment check:', {
    hasKey: !!apiKey,
    keyPreview: apiKey ? `${apiKey.slice(0, 10)}...` : 'none',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('ABLY'))
  });
  
  if (!apiKey) {
    console.error('[Ably Auth API] API key not found in environment');
    return NextResponse.json(
      { 
        error: 'Ably API key not configured',
        hint: 'Set ABLY_API_KEY in Vercel environment variables'
      },
      { status: 500 }
    );
  }
  
  // Return the key to authenticated users
  // TODO: Add session check here for security
  return NextResponse.json({ 
    apiKey,
    timestamp: Date.now()
  });
}
