import { NostrKeys } from './nostr';

const KEYS_STORAGE_KEY = 'nostrich_signer_keys';
const SETTINGS_STORAGE_KEY = 'nostrich_signer_settings';

export interface AppSettings {
  autoScan: boolean;
  detailedLogs: boolean;
  serverUrl: string;
}

export function saveKeys(keys: NostrKeys): void {
  try {
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error('Failed to save keys to localStorage:', error);
  }
}

export function loadKeys(): NostrKeys | null {
  try {
    const stored = localStorage.getItem(KEYS_STORAGE_KEY);
    if (!stored) return null;
    
    return JSON.parse(stored) as NostrKeys;
  } catch (error) {
    console.error('Failed to load keys from localStorage:', error);
    return null;
  }
}

export function deleteKeys(): void {
  try {
    localStorage.removeItem(KEYS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to delete keys from localStorage:', error);
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
}

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    // Use dev server for this environment, production server for prod
    const devServer = 'https://ae2c3363-e58f-4e84-bccb-70ae9f5b7c81-00-2nso0uyajux8e.kirk.replit.dev';
    const prodServer = 'https://auth.nostrich.pro';
    const defaultServer = import.meta.env.MODE === 'development' ? devServer : prodServer;
    
    const defaults = { autoScan: true, detailedLogs: false, serverUrl: defaultServer };
    
    if (!stored) {
      return defaults;
    }
    
    return { ...defaults, ...JSON.parse(stored) };
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    const devServer = 'https://ae2c3363-e58f-4e84-bccb-70ae9f5b7c81-00-2nso0uyajux8e.kirk.replit.dev';
    const prodServer = 'https://auth.nostrich.pro';
    const defaultServer = import.meta.env.MODE === 'development' ? devServer : prodServer;
    return { autoScan: true, detailedLogs: false, serverUrl: defaultServer };
  }
}

export function exportKeysAsFile(keys: NostrKeys): void {
  const exportData = {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    npub: keys.npub,
    nsec: keys.nsec,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nostrich-keys-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
