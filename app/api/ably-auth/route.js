import { NextResponse } from 'next/server';

export async function GET() {
  // Vercel environment variables are available server-side
  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  
  if (!apiKey) {
    console.error('[Ably Auth API] API key not found in environment');
    return NextResponse.json(
      { error: 'Ably API key not configured' },
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
