import { useState, useEffect } from 'react';
import { Settings, Signature, CheckCircle, QrCode, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { QRScanner } from '@/components/QRScanner';
import { KeyManagement } from '@/components/KeyManagement';
import { StatusBanner } from '@/components/StatusBanner';
import { NostrKeys, generateKeys, parseNWCUri, createAndSignEvent, publishEvent } from '@/lib/nostr';
import { saveKeys, loadKeys, deleteKeys, saveSettings, loadSettings, AppSettings } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface ActivityEvent {
  id: string;
  type: 'scan' | 'sign' | 'error';
  message: string;
  timestamp: Date;
  status: 'success' | 'error' | 'info';
}

export default function Signer() {
  const [keys, setKeys] = useState<NostrKeys | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [keyManagerOpen, setKeyManagerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ autoScan: true, detailedLogs: false });
  const [statusBanner, setStatusBanner] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({ visible: false, type: 'info', message: '' });
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  // Load keys and settings on mount
  useEffect(() => {
    const storedKeys = loadKeys();
    const storedSettings = loadSettings();
    
    if (storedKeys) {
      setKeys(storedKeys);
    } else {
      // Auto-generate keys on first visit
      const newKeys = generateKeys();
      setKeys(newKeys);
      saveKeys(newKeys);
      showStatus('info', 'New keys generated automatically for first-time use');
    }
    
    setSettings(storedSettings);
  }, []);

  const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
    setStatusBanner({ visible: true, type, message });
    setTimeout(() => {
      setStatusBanner(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  const addActivity = (type: ActivityEvent['type'], message: string, status: ActivityEvent['status']) => {
    const newEvent: ActivityEvent = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      status
    };
    
    setRecentActivity(prev => [newEvent, ...prev.slice(0, 4)]);
  };

  const handleKeysChange = (newKeys: NostrKeys | null) => {
    setKeys(newKeys);
    if (newKeys) {
      saveKeys(newKeys);
    } else {
      deleteKeys();
    }
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleQRCodeDetected = async (data: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    addActivity('scan', `QR code detected: ${data.substring(0, 50)}...`, 'info');
    
    try {
      console.log('QR Code data:', data);
      
      // Parse NWC URI
      const nwcData = parseNWCUri(data);
      if (!nwcData) {
        throw new Error(`Invalid QR code format. Expected Nostr Wallet Connect URI, got: ${data.substring(0, 100)}`);
      }

      console.log('Parsed NWC data:', nwcData);
      addActivity('scan', `Parsed challengeId: ${nwcData.challengeId}`, 'info');

      if (!keys) {
        throw new Error('No keys available for signing. Please generate or import keys first.');
      }

      // Create and sign event
      addActivity('sign', 'Creating and signing event...', 'info');
      const signedEvent = createAndSignEvent(keys.privateKey, keys.publicKey, nwcData);
      
      console.log('Signed event:', signedEvent);

      // Publish to auth server
      addActivity('sign', 'Publishing to auth.nostrich.pro...', 'info');
      await publishEvent(signedEvent);
      
      showStatus('success', 'Event signed successfully! Authentication completed and sent to auth.nostrich.pro');
      addActivity('sign', 'Event signed and published successfully', 'success');
      
      toast({
        title: "Success!",
        description: "Authentication event signed and published successfully.",
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('QR processing error:', error);
      showStatus('error', `Failed to process QR code: ${errorMessage}`);
      addActivity('error', errorMessage, 'error');
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hours ago`;
  };

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'scan': return QrCode;
      case 'sign': return CheckCircle;
      case 'error': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const getActivityColor = (status: ActivityEvent['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-600';
      case 'error': return 'bg-red-100 text-red-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  const getStatusColor = (status: ActivityEvent['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Signature className="text-primary-foreground h-4 w-4" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Nostrich Signer</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="p-2"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Status Banner */}
        <StatusBanner
          type={statusBanner.type}
          message={statusBanner.message}
          isVisible={statusBanner.visible}
          onClose={() => setStatusBanner(prev => ({ ...prev, visible: false }))}
        />

        {/* Key Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Key Status</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${keys ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${keys ? 'text-green-600' : 'text-red-600'}`}>
                {keys ? 'Ready' : 'No Keys'}
              </span>
            </div>
          </div>
          
          {keys && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">Public Key</Label>
                <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-800 break-all mt-2">
                  {keys.npub}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(keys.npub);
                      toast({ title: "Copied!", description: "Public key copied to clipboard." });
                    } catch {
                      toast({ title: "Failed to copy", variant: "destructive" });
                    }
                  }}
                  className="flex-1"
                >
                  Copy
                </Button>
                <Button onClick={() => setKeyManagerOpen(true)} className="flex-1">
                  <Key className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              </div>
            </div>
          )}
          
          {!keys && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">No keys found. Generate or import keys to continue.</p>
              <Button onClick={() => setKeyManagerOpen(true)} className="w-full">
                <Key className="mr-2 h-4 w-4" />
                Manage Keys
              </Button>
            </div>
          )}
        </div>

        {/* QR Scanner */}
        <QRScanner
          onQRCodeDetected={handleQRCodeDetected}
          isScanning={isScanning}
          onScanningChange={setIsScanning}
        />

        {/* Test QR Code Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test QR Processing</h2>
          <p className="text-gray-600 text-sm mb-4">
            Test QR code processing without camera by entering a Nostr Wallet Connect URI manually:
          </p>
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                const testUri = "nostr+walletconnect://?challengeId=test123&relay=wss%3A//relay.damus.io&secret=abc456";
                handleQRCodeDetected(testUri);
              }}
              className="w-full"
              disabled={isProcessing}
            >
              Test with Sample URI
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const testData = prompt("Enter QR code data to test:");
                if (testData) {
                  handleQRCodeDetected(testData);
                }
              }}
              className="w-full"
              disabled={isProcessing}
            >
              Test with Custom Data
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((event) => {
                const Icon = getActivityIcon(event.type);
                return (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(event.status)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.message}</p>
                        <p className="text-xs text-gray-600">{formatTimeAgo(event.timestamp)}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(event.status)}`}>
                      {event.status === 'success' ? 'Success' : event.status === 'error' ? 'Error' : 'Info'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          )}
        </div>

      </main>

      {/* Key Management Modal */}
      <KeyManagement
        isOpen={keyManagerOpen}
        onClose={() => setKeyManagerOpen(false)}
        currentKeys={keys}
        onKeysChange={handleKeysChange}
      />

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Application Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium text-gray-900">Auto-scan QR codes</Label>
                    <p className="text-sm text-gray-600">Automatically process detected QR codes</p>
                  </div>
                  <Switch
                    checked={settings.autoScan}
                    onCheckedChange={(checked) => handleSettingsChange({ ...settings, autoScan: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium text-gray-900">Show detailed logs</Label>
                    <p className="text-sm text-gray-600">Display technical information</p>
                  </div>
                  <Switch
                    checked={settings.detailedLogs}
                    onCheckedChange={(checked) => handleSettingsChange({ ...settings, detailedLogs: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">About</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Version:</strong> 1.0.0</p>
                <p><strong>Server:</strong> auth.nostrich.pro</p>
                <p><strong>Protocol:</strong> Nostr Wallet Connect</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
