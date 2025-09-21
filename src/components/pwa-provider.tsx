// ABOUTME: PWA provider component for handling service worker registration and PWA features
// ABOUTME: Manages offline functionality, background sync, and PWA lifecycle events

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface PWAProviderProps {
  children: React.ReactNode;
}

export default function PWAProvider({ children }: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Register service worker
    registerServiceWorker();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...', {
        icon: '🌐',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You\'re offline. Changes will be saved and synced later.', {
        icon: '📱',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker messages
    const handleSWMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'SYNC_SUCCESS':
          toast.success(`Synced: ${data.action}`, {
            icon: '✅',
          });
          break;
        
        case 'SYNC_FAILED':
          toast.error(`Sync failed: ${data.action}`, {
            icon: '❌',
          });
          break;
        
        case 'CACHE_UPDATED':
          toast.success('App updated! Refresh to see changes.', {
            icon: '🔄',
            duration: 6000,
          });
          break;
        
        case 'OFFLINE_ACTION_QUEUED':
          toast.success('Action queued for sync', {
            icon: '⏰',
          });
          break;
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setSwRegistration(registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
              // New update available
              setUpdateAvailable(true);
              toast.success('App update available! Tap to refresh.', {
                icon: '🔄',
                duration: 8000,
              });
            }
          });
        }
      });

      // Handle service worker controller change
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // New service worker has taken control
          window.location.reload();
        });
      }

      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  // Preload critical resources for offline use
  useEffect(() => {
    if (swRegistration && isOnline) {
      // Cache equipment data
      cacheEquipmentData();
    }
  }, [swRegistration, isOnline]);

  const cacheEquipmentData = async () => {
    try {
      // Fetch and cache equipment list
      const equipmentResponse = await fetch('/api/equipment?limit=100');
      if (equipmentResponse.ok) {
        const equipment = await equipmentResponse.json();
        
        // Send to service worker for caching
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_EQUIPMENT',
            equipment: equipment.data || equipment,
          });
        }
      }

      // Cache user data
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_USERS',
            users: users.data || users,
          });
        }
      }
    } catch (error) {
      console.error('Error preloading data for offline use:', error);
    }
  };

  // Handle app installation
  useEffect(() => {
    const handleAppInstalled = () => {
      toast.success('ProfiCo app installed successfully!', {
        icon: '📱',
        duration: 5000,
      });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle visibility change for background sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // App became visible, check for pending syncs
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_PENDING_SYNC',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Check if app is installed (PWA mode)
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    }
  }, []);

  // Expose PWA state to child components
  const pwaState = {
    isOnline,
    swRegistration,
    updateAvailable,
    isInstalled,
  };

  // Inject PWA state into global context if needed
  useEffect(() => {
    // Make PWA state available globally
    (window as any).pwaState = pwaState;
  }, [pwaState]);

  return (
    <>
      {children}
      
      {/* PWA Update Banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 text-center">
          <div className="flex items-center justify-center space-x-3">
            <span className="text-sm">App update available!</span>
            <button
              onClick={() => {
                if (swRegistration?.waiting) {
                  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
                window.location.reload();
              }}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium"
            >
              Update Now
            </button>
          </div>
        </div>
      )}
    </>
  );
}