import Ably from 'ably/promises';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ABLY_API_KEY not configured' });
    const rest = new Ably.Rest(apiKey);
    const tokenRequest = await rest.auth.createTokenRequest({ clientId: 'recuperiamo-web' });
    res.status(200).json(tokenRequest);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Ably token error' });
  }
}
