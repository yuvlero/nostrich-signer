import { finalizeEvent, generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface NostrKeys {
  publicKey: string;
  privateKey: string;
  npub: string;
  nsec: string;
}

export interface NWCUri {
  challengeId: string;
  relay: string;
  secret: string;
  domain?: string;
}

export interface NostrEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  pubkey: string;
  id: string;
  sig: string;
}

export function generateKeys(): NostrKeys {
  const privateKey = generateSecretKey();
  const publicKey = getPublicKey(privateKey);
  
  return {
    publicKey,
    privateKey: bytesToHex(privateKey),
    npub: nip19.npubEncode(publicKey),
    nsec: nip19.nsecEncode(privateKey)
  };
}

export function importPrivateKey(input: string): NostrKeys | null {
  try {
    let privateKeyBytes: Uint8Array;
    
    if (input.startsWith('nsec1')) {
      const decoded = nip19.decode(input);
      if (decoded.type !== 'nsec') throw new Error('Invalid nsec format');
      privateKeyBytes = decoded.data;
    } else {
      // Try hex format
      privateKeyBytes = hexToBytes(input);
    }
    
    if (privateKeyBytes.length !== 32) {
      throw new Error('Private key must be 32 bytes');
    }
    
    const publicKey = getPublicKey(privateKeyBytes);
    
    return {
      publicKey,
      privateKey: bytesToHex(privateKeyBytes),
      npub: nip19.npubEncode(publicKey),
      nsec: nip19.nsecEncode(privateKeyBytes)
    };
  } catch (error) {
    console.error('Failed to import private key:', error);
    return null;
  }
}

export function parseNWCUri(uri: string): NWCUri | null {
  try {
    const url = new URL(uri);
    
    if (!url.protocol.startsWith('nostr')) {
      return null;
    }
    
    // For nostr+walletconnect:// URIs, the challenge ID is typically the hostname
    // and relay/secret/domain are URL parameters
    let challengeId = url.searchParams.get('challengeId') || url.hostname;
    const relay = url.searchParams.get('relay');
    const secret = url.searchParams.get('secret');
    const domain = url.searchParams.get('domain');
    
    // Handle case where challengeId might be in pathname (remove leading slash)
    if (!challengeId || challengeId === '') {
      challengeId = url.pathname.replace('/', '');
    }
    
    // Log only for debugging if needed
    
    if (!challengeId || !relay || !secret) {
      console.error('Missing required NWC parameters:', { challengeId: !!challengeId, relay: !!relay, secret: !!secret });
      return null;
    }
    
    return {
      challengeId,
      relay: decodeURIComponent(relay),
      secret,
      domain: domain ? decodeURIComponent(domain) : undefined
    };
  } catch (error) {
    console.error('Failed to parse NWC URI:', error);
    return null;
  }
}

export function createAndSignEvent(
  privateKeyHex: string,
  publicKeyHex: string,
  nwcData: NWCUri
): NostrEvent {
  const privateKeyBytes = hexToBytes(privateKeyHex);
  
  const eventTemplate = {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['challenge', nwcData.challengeId],
      ['nwc', nwcData.secret],
      ['relay', nwcData.relay]
    ],
    content: '',
    pubkey: publicKeyHex
  };
  
  return finalizeEvent(eventTemplate, privateKeyBytes);
}

export async function publishEvent(event: NostrEvent, serverUrl: string = 'https://auth.nostrich.pro'): Promise<boolean> {
  try {
    console.log('Publishing event via proxy...', event);
    
    const response = await fetch('/api/publish-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ ...event, serverUrl })
    });
    
    console.log('Proxy response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Proxy error response:', errorData);
      throw new Error(errorData.error || `Proxy responded with ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('Success response:', responseData);
    
    return true;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the proxy server. Check your connection.');
    }
    console.error('Failed to publish event:', error);
    throw error;
  }
}
