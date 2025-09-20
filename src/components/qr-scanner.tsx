'use client';

import { useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Camera, QrCode, Scan } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  trigger?: React.ReactNode;
}

export default function QRScanner({ onScan, trigger }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      // Wait for the video element to be rendered after state change
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (!videoRef.current) {
        setError('Failed to access camera');
        setIsScanning(false);
        return;
      }
      
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            onScan(result.getText());
            stopScanning();
            setIsOpen(false);
          } else if (error && error.name !== 'NotFoundException') {
            setError('Failed to scan QR code');
          }
        }
      );
    } catch (err) {
      setError('Failed to access camera');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      // Stop the video stream by ending the track
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      codeReaderRef.current = null;
    }
    setIsScanning(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      stopScanning();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Scan className="h-4 w-4 mr-2" />
            Scan QR Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!isScanning ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Camera className="h-16 w-16 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Click &quot;Start Scanning&quot; to scan QR codes with your camera
              </p>
              <Button onClick={startScanning} className="w-full">
                Start Scanning
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <video
                ref={videoRef}
                data-testid="video-element"
                className="w-full h-64 bg-black rounded-lg"
                playsInline
                muted
              />
              <Button 
                variant="outline" 
                onClick={stopScanning}
                className="w-full"
              >
                Stop Scanning
              </Button>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}