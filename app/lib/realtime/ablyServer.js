// Server-side Ably client for publishing events from API routes
import Ably from 'ably/promises.js';

let _restClient = null;

/**
 * Get or create the Ably REST client for server-side operations
 * @returns {Ably.Rest|null}
 */
export function getAblyServerClient() {
  if (_restClient) return _restClient;
  
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.warn('[Ably Server] ABLY_API_KEY not configured, realtime features disabled');
    return null;
  }
  
  try {
    _restClient = new Ably.Rest(apiKey);
    return _restClient;
  } catch (err) {
    console.error('[Ably Server] Failed to initialize REST client:', err?.message || err);
    return null;
  }
}

/**
 * Publish an event to an Ably channel from server-side
 * @param {string} channelName - The name of the channel
 * @param {string} eventName - The name of the event
 * @param {object} data - The event data
 * @returns {Promise<void>}
 */
export async function publishEvent(channelName, eventName, data) {
  const client = getAblyServerClient();
  if (!client) {
    console.warn('[Ably Server] Cannot publish event, client not available');
    return;
  }
  
  try {
    const channel = client.channels.get(channelName);
    await channel.publish(eventName, data);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Ably Server] Published event "${eventName}" to channel "${channelName}"`);
    }
  } catch (err) {
    console.error(`[Ably Server] Failed to publish event "${eventName}" to "${channelName}":`, err?.message || err);
    throw err;
  }
}
