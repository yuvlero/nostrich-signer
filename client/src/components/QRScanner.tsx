import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Square, Zap, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    
    if (code) {
      setStatus('QR Code detected!');
      onQRCodeDetected(code.data);
      stopCamera();
      return;
    }
    
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [onQRCodeDetected, stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      setStatus('Requesting camera permission...');
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for flash support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setFlashSupported('torch' in capabilities);
      
      setHasPermission(true);
      onScanningChange(true);
      setStatus('Scanning for QR codes...');
      
      // Start scanning
      animationRef.current = requestAnimationFrame(scanFrame);
      
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
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
          Scan a Nostr Wallet Connect QR code to authenticate and sign events.
        </p>
      </div>

      {/* Camera View */}
      <div className="relative bg-gray-900 aspect-square mx-4 mb-4 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ display: isScanning ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Camera className="text-gray-400 h-12 w-12 mb-3 mx-auto" />
              <p className="text-gray-400 text-sm">Camera not active</p>
              <p className="text-gray-500 text-xs mt-1">Tap start to begin scanning</p>
            </div>
          </div>
        )}
        
        {/* QR Scanner Overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white rounded-lg relative">
              {/* Corner indicators */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
              
              {/* Scanning line animation */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Permission denied overlay */}
        {hasPermission === false && (
          <div className="absolute inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center">
            <div className="text-center text-white p-6">
              <Camera className="h-8 w-8 mb-3 mx-auto" />
              <p className="font-medium mb-2">Camera Permission Required</p>
              <p className="text-sm opacity-90">Please enable camera access to scan QR codes</p>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Controls */}
      <div className="p-6 pt-0">
        <div className="flex space-x-3">
          <Button
            onClick={isScanning ? stopCamera : startCamera}
            className="flex-1"
            disabled={hasPermission === false}
          >
            {isScanning ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Scanning
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Scanning
              </>
            )}
          </Button>
          
          {flashSupported && (
            <Button
              variant="outline"
              onClick={toggleFlash}
              disabled={!isScanning}
              className={flashEnabled ? 'bg-yellow-100' : ''}
            >
              <Zap className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
