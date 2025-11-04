import { NextResponse } from 'next/server';

export async function GET() {
  // Vercel environment variables are available server-side
  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  
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
        hint: 'Set NEXT_PUBLIC_ABLY_API_KEY in Vercel environment variables'
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
