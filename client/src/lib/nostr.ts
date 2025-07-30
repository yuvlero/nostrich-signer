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
    
    if (url.protocol !== 'nostr+walletconnect:') {
      return null;
    }
    
    const challengeId = url.searchParams.get('challengeId');
    const relay = url.searchParams.get('relay');
    const secret = url.searchParams.get('secret');
    
    if (!challengeId || !relay || !secret) {
      return null;
    }
    
    return {
      challengeId,
      relay: decodeURIComponent(relay),
      secret
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
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['challenge', nwcData.challengeId],
      ['nwc', nwcData.secret],
      ['relay', nwcData.relay]
    ],
    content: 'Signed login response',
    pubkey: publicKeyHex
  };
  
  return finalizeEvent(eventTemplate, privateKeyBytes);
}

export async function publishEvent(event: NostrEvent): Promise<boolean> {
  try {
    const response = await fetch('https://auth.nostrich.pro/api/publish-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to publish event:', error);
    throw error;
  }
}
