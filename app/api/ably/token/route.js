import Ably from 'ably/promises';

export async function GET() {
  try {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ABLY_API_KEY not configured' }), { status: 500 });
    }
    const rest = new Ably.Rest(apiKey);
    const tokenRequest = await rest.auth.createTokenRequest({ clientId: 'recuperiamo-web' });
    return new Response(JSON.stringify(tokenRequest), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Ably token error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}