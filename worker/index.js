// ABOUTME: Custom service worker for advanced offline functionality and background sync
// ABOUTME: Handles offline queue management, equipment data caching, and sync when online

import { BackgroundSync } from 'workbox-background-sync';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

// Clean up old caches
cleanupOutdatedCaches();

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Background sync for offline actions
const bgSync = new BackgroundSync('offline-actions', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
});

// Equipment update queue for offline actions
const equipmentUpdateQueue = new BackgroundSync('equipment-updates', {
  maxRetentionTime: 24 * 60,
});

// Maintenance log queue for offline actions
const maintenanceQueue = new BackgroundSync('maintenance-logs', {
  maxRetentionTime: 24 * 60,
});

// Handle equipment status updates - queue for background sync
registerRoute(
  ({ request, url }) => {
    return url.pathname.includes('/api/equipment/') && 
           (request.method === 'PUT' || request.method === 'PATCH');
  },
  async ({ request, event }) => {
    try {
      return await fetch(request);
    } catch (error) {
      // Add to background sync queue if offline
      await equipmentUpdateQueue.addRequest(request);
      
      // Store the failed request data in IndexedDB for UI updates
      const requestData = await request.clone().json();
      await storeOfflineAction({
        type: 'equipment-update',
        data: requestData,
        url: request.url,
        method: request.method,
        timestamp: Date.now(),
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        queued: true,
        message: 'Update queued for sync when online' 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
);

// Handle maintenance log creation - queue for background sync
registerRoute(
  ({ request, url }) => {
    return url.pathname.includes('/api/maintenance') && request.method === 'POST';
  },
  async ({ request, event }) => {
    try {
      return await fetch(request);
    } catch (error) {
      await maintenanceQueue.addRequest(request);
      
      const requestData = await request.clone().json();
      await storeOfflineAction({
        type: 'maintenance-log',
        data: requestData,
        url: request.url,
        method: request.method,
        timestamp: Date.now(),
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        queued: true,
        message: 'Maintenance log queued for sync' 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
);

// Enhanced equipment data caching for offline viewing
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/equipment'),
  new StaleWhileRevalidate({
    cacheName: 'equipment-api',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request, mode, params, event }) => {
          // Create cache keys that include timestamps for better management
          const url = new URL(request.url);
          if (url.searchParams.has('page')) {
            // For paginated requests, cache by page
            return `${request.url}-${mode}`;
          }
          return request.url;
        },
        cacheWillUpdate: async ({ request, response, event, state }) => {
          // Only cache successful responses
          return response.status === 200;
        },
      },
    ],
  })
);

// Cache user data for offline functionality
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/users'),
  new StaleWhileRevalidate({
    cacheName: 'user-api',
  })
);

// Offline fallback for navigation requests
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    networkTimeoutSeconds: 10,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          return response.status === 200;
        },
      },
    ],
  }),
  {
    allowlist: [/^(?!\/__).*/], // Exclude Next.js internal routes
    denylist: [/\/_next\/static\//, /\/api\//], // Exclude static assets and API routes
  }
);

registerRoute(navigationRoute);

// Handle background sync events
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'offline-actions') {
    event.waitUntil(processOfflineActions());
  }
});

// IndexedDB operations for offline queue management
async function storeOfflineAction(action) {
  const db = await openDB();
  const tx = db.transaction(['offline-actions'], 'readwrite');
  await tx.objectStore('offline-actions').add(action);
}

async function getOfflineActions() {
  const db = await openDB();
  const tx = db.transaction(['offline-actions'], 'readonly');
  return await tx.objectStore('offline-actions').getAll();
}

async function removeOfflineAction(id) {
  const db = await openDB();
  const tx = db.transaction(['offline-actions'], 'readwrite');
  await tx.objectStore('offline-actions').delete(id);
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ProfiCoOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create offline actions store
      if (!db.objectStoreNames.contains('offline-actions')) {
        const store = db.createObjectStore('offline-actions', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('type', 'type');
      }
      
      // Create cached equipment store
      if (!db.objectStoreNames.contains('cached-equipment')) {
        const equipmentStore = db.createObjectStore('cached-equipment', { 
          keyPath: 'id' 
        });
        equipmentStore.createIndex('lastCached', 'lastCached');
      }
    };
  });
}

// Process queued offline actions when back online
async function processOfflineActions() {
  const actions = await getOfflineActions();
  
  for (const action of actions) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action.data),
      });
      
      if (response.ok) {
        await removeOfflineAction(action.id);
        
        // Broadcast success to all clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              action: action.type,
              data: action.data,
            });
          });
        });
      }
    } catch (error) {
      console.error('Failed to sync offline action:', error);
    }
  }
}

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'ProfiCo Update', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action) {
    // Handle action button clicks
    switch (event.action) {
      case 'view':
        event.waitUntil(
          clients.openWindow(event.notification.data.url || '/')
        );
        break;
      case 'dismiss':
        // Just close the notification
        break;
    }
  } else {
    // Handle notification body click
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Enhanced cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_EQUIPMENT') {
    event.waitUntil(cacheEquipmentData(event.data.equipment));
  }
  
  if (event.data && event.data.type === 'GET_OFFLINE_ACTIONS') {
    event.waitUntil(
      getOfflineActions().then(actions => {
        event.ports[0].postMessage({ actions });
      })
    );
  }
});

// Cache equipment data for offline access
async function cacheEquipmentData(equipment) {
  const db = await openDB();
  const tx = db.transaction(['cached-equipment'], 'readwrite');
  const store = tx.objectStore('cached-equipment');
  
  for (const item of equipment) {
    await store.put({
      ...item,
      lastCached: Date.now(),
    });
  }
}

console.log('ProfiCo Service Worker loaded successfully');