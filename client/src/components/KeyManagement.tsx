import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Key, Plus, Download, Upload, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { NostrKeys, generateKeys, importPrivateKey } from '@/lib/nostr';
import { exportKeysAsFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface KeyManagementProps {
  isOpen: boolean;
  onClose: () => void;
  currentKeys: NostrKeys | null;
  onKeysChange: (keys: NostrKeys | null) => void;
}

export function KeyManagement({ isOpen, onClose, currentKeys, onKeysChange }: KeyManagementProps) {
  const [importText, setImportText] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const handleGenerateNew = () => {
    const newKeys = generateKeys();
    onKeysChange(newKeys);
    toast({
      title: "New keys generated",
      description: "A new key pair has been created and saved.",
    });
  };

  const handleImport = () => {
    if (!importText.trim()) {
      toast({
        title: "Import failed",
        description: "Please enter a private key to import.",
        variant: "destructive",
      });
      return;
    }

    const importedKeys = importPrivateKey(importText.trim());
    if (!importedKeys) {
      toast({
        title: "Import failed",
        description: "Invalid private key format. Please check your input.",
        variant: "destructive",
      });
      return;
    }

    onKeysChange(importedKeys);
    setImportText('');
    toast({
      title: "Keys imported successfully",
      description: "Your private key has been imported and saved.",
    });
  };

  const handleExport = () => {
    if (!currentKeys) return;
    
    try {
      exportKeysAsFile(currentKeys);
      toast({
        title: "Keys exported",
        description: "Your keys have been downloaded as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export keys. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyPublicKey = async () => {
    if (!currentKeys) return;
    
    try {
      await navigator.clipboard.writeText(currentKeys.npub);
      toast({
        title: "Copied to clipboard",
        description: "Public key (npub) copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKeys = () => {
    onKeysChange(null);
    setShowDeleteConfirm(false);
    toast({
      title: "Keys deleted",
      description: "All keys have been removed from storage.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5" />
            Key Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* Current Key Display */}
          {currentKeys && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Current Keys</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Public Key (npub)</Label>
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-800 break-all mt-2">
                    {currentKeys.npub}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Private Key (nsec)</Label>
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-800 relative mt-2">
                    <span className={showPrivateKey ? '' : 'blur-sm select-none'}>
                      {currentKeys.nsec}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="absolute right-2 top-2 p-1 h-8 w-8"
                    >
                      {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-orange-600 mt-1 flex items-center">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Keep your private key secure and never share it
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Actions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleGenerateNew}
                className="p-4 h-auto flex-col space-y-2"
              >
                <Plus className="h-6 w-6 text-gray-400" />
                <span className="text-sm font-medium">Generate New</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!currentKeys}
                className="p-4 h-auto flex-col space-y-2"
              >
                <Download className="h-6 w-6 text-gray-400" />
                <span className="text-sm font-medium">Export Keys</span>
              </Button>
            </div>
            
            {currentKeys && (
              <Button
                variant="outline"
                onClick={handleCopyPublicKey}
                className="w-full mt-3"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Public Key
              </Button>
            )}
          </div>

          {/* Import Key */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Import Existing Key</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Private Key (nsec or hex)</Label>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="nsec1... or hex private key"
                  className="font-mono text-sm resize-none mt-2"
                  rows={3}
                />
              </div>
              <Button onClick={handleImport} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Import Key
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          {currentKeys && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-lg font-medium text-red-600 mb-3">Danger Zone</h3>
              
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Keys
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-600 font-medium">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteKeys}
                      className="flex-1"
                    >
                      Yes, Delete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2 text-center">
                Make sure to export your keys first if you want to keep them.
              </p>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
