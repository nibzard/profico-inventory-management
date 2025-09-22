'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Smartphone, CheckCircle } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      // Don't auto-show prompt, wait for user to click button
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support beforeinstallprompt
      // Show manual installation instructions
      alert('To install this app:\n\nChrome/Edge: Click the three dots menu → "Install ProfiCo Inventory"\n\nSafari: Click Share button → "Add to Home Screen"\n\nFirefox: Look for the install icon in the address bar');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('Install outcome:', outcome);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallPrompt(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
      // Show fallback instructions
      alert('Installation failed. Try manually:\n\nChrome/Edge: Three dots menu → "Install ProfiCo Inventory"\n\nSafari: Share → "Add to Home Screen"');
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4" />
        <span>App installed</span>
      </div>
    );
  }

  if (!showInstallPrompt) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (deferredPrompt) {
            setShowInstallPrompt(true);
          } else {
            handleInstall(); // Show manual instructions immediately
          }
        }}
        className="md:hidden flex"
      >
        <Download className="h-4 w-4 mr-2" />
        Install App
      </Button>
    );
  }

  return (
    <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            Install ProfiCo App
          </DialogTitle>
          <DialogDescription>
            Install our inventory management app on your device for quick access
            and offline functionality.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Benefits:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Quick access from your home screen</li>
                <li>• Works offline for basic operations</li>
                <li>• Push notifications for updates</li>
                <li>• Better performance and reliability</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleInstall} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}