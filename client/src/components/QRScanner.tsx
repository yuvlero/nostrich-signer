import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Square, Zap, Play, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsQR from 'jsqr';

interface QRScannerProps {
  onQRCodeDetected: (data: string) => void;
  isScanning: boolean;
  onScanningChange: (scanning: boolean) => void;
}

export function QRScanner({ onQRCodeDetected, isScanning, onScanningChange }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [status, setStatus] = useState('Ready to scan');
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pastedUri, setPastedUri] = useState('');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    onScanningChange(false);
    setStatus('Ready to scan');
  }, [onScanningChange]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code && code.data) {
      // Only process if it looks like a valid NWC URI or other expected format
      const data = code.data.trim();
      console.log('QR detected (first 100 chars):', data.substring(0, 100));
      
      if (data.length > 10 && (
        data.startsWith('nostr+walletconnect://') || 
        data.startsWith('nostr://') ||
        data.startsWith('lnurlp://') ||
        data.startsWith('lnbc') ||
        data.startsWith('http')
      )) {
        console.log('Valid QR code format detected, processing...');
        setStatus('QR Code detected!');
        onQRCodeDetected(data);
        stopCamera();
        return;
      } else {
        // Log invalid QR codes but don't process them
        console.log('Invalid QR format detected, ignoring and continuing to scan');
      }
    }
    
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [onQRCodeDetected, stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      setStatus('Requesting camera permission...');
      onScanningChange(true); // Open modal first
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Wait for modal to be open and video element to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Add event listeners for video loading
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          setStatus('Camera ready...');
        };
        
        videoRef.current.oncanplay = () => {
          console.log('Video can play');
          setStatus('Scanning for QR codes...');
          // Start scanning after video is ready
          animationRef.current = requestAnimationFrame(scanFrame);
        };
        
        videoRef.current.onerror = (e) => {
          console.error('Video error:', e);
          setStatus('Video error occurred');
        };
        
        await videoRef.current.play();
      }

      // Check for flash support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setFlashSupported('torch' in capabilities);
      
      setHasPermission(true);
      
    } catch (error) {
      console.error('Camera error:', error);
      setHasPermission(false);
      setStatus('Camera permission denied');
      onScanningChange(false);
    }
  }, [onScanningChange, scanFrame]);

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current || !flashSupported) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !flashEnabled } as any]
      });
      setFlashEnabled(!flashEnabled);
    } catch (error) {
      console.error('Flash toggle error:', error);
    }
  }, [flashEnabled, flashSupported]);

  const handlePasteUri = useCallback(() => {
    if (pastedUri.trim()) {
      onQRCodeDetected(pastedUri.trim());
      setPastedUri('');
      setPasteDialogOpen(false);
    }
  }, [pastedUri, onQRCodeDetected]);

  // Effect to handle video stream when modal opens
  useEffect(() => {
    if (isScanning && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [isScanning]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">QR Code Scanner</h2>
            <div className="text-sm text-gray-600 flex items-center">
              <Camera className="mr-1 h-4 w-4" />
              <span>{status}</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Scan a Nostr Wallet Connect QR code or paste the URI directly to authenticate and sign events.
          </p>
        </div>

        {/* Scanner Controls */}
        <div className="p-6 pt-0">
          <div className="flex space-x-3">
            <Button
              onClick={startCamera}
              className="flex-1"
              disabled={hasPermission === false}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Scanning
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setPasteDialogOpen(true)}
              className="flex-1"
            >
              <Link className="mr-2 h-4 w-4" />
              Paste Link
            </Button>
          </div>
        </div>
      </div>

      {/* Full Screen Camera Modal */}
      <Dialog open={isScanning} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-none w-screen h-screen m-0 p-0 border-0 bg-black">
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
              controls={false}
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Top Controls Bar */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopCamera}
                  className="text-white hover:bg-white/20"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Close
                </Button>
                
                {flashSupported && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFlash}
                    className={`text-white hover:bg-white/20 ${flashEnabled ? 'bg-yellow-400/30' : ''}`}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* QR Scanner Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                
                {/* Scanning line animation */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-pulse"></div>
              </div>
            </div>

            {/* Bottom Status */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-6">
              <div className="text-center text-white">
                <p className="text-lg font-medium">{status}</p>
                <p className="text-sm opacity-75 mt-1">Position QR code within the frame</p>
              </div>
            </div>

            {/* Permission denied overlay */}
            {hasPermission === false && (
              <div className="absolute inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center z-20">
                <div className="text-center text-white p-6">
                  <Camera className="h-12 w-12 mb-4 mx-auto" />
                  <p className="text-xl font-medium mb-2">Camera Permission Required</p>
                  <p className="text-sm opacity-90">Please enable camera access to scan QR codes</p>
                  <Button
                    variant="outline"
                    onClick={stopCamera}
                    className="mt-4 text-white border-white hover:bg-white hover:text-black"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Paste URI Dialog */}
      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Link className="mr-2 h-5 w-5" />
              Paste NWC URI
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="nwc-uri">Nostr Wallet Connect URI</Label>
              <Input
                id="nwc-uri"
                placeholder="nostr+walletconnect://..."
                value={pastedUri}
                onChange={(e) => setPastedUri(e.target.value)}
                className="mt-2"
              />
              <p className="text-sm text-gray-600 mt-2">
                Paste the NWC URI from your wallet app to sign the authentication event.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPasteDialogOpen(false);
                  setPastedUri('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasteUri}
                disabled={!pastedUri.trim()}
                className="flex-1"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
