// ABOUTME: Hook for managing offline data storage and synchronization using IndexedDB
// ABOUTME: Handles caching equipment data, queuing offline actions, and sync status

'use client';

import { useState, useEffect, useCallback } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineAction {
  id?: number;
  type: string;
  data: any;
  url: string;
  method: string;
  timestamp: number;
}

interface CachedEquipment {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  category: string;
  brand?: string;
  model?: string;
  currentOwner?: any;
  lastCached: number;
}

interface ProfiCoOfflineDB extends DBSchema {
  'offline-actions': {
    key: number;
    value: OfflineAction;
    indexes: { 'timestamp': number; 'type': string };
  };
  'cached-equipment': {
    key: string;
    value: CachedEquipment;
    indexes: { 'lastCached': number; 'status': string; 'category': string };
  };
  'cached-users': {
    key: string;
    value: {
      id: string;
      name: string;
      email: string;
      role: string;
      lastCached: number;
    };
    indexes: { 'lastCached': number };
  };
}

export function useOfflineData() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [db, setDb] = useState<IDBPDatabase<ProfiCoOfflineDB> | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB<ProfiCoOfflineDB>('ProfiCoOfflineDB', 1, {
          upgrade(db) {
            // Offline actions store
            if (!db.objectStoreNames.contains('offline-actions')) {
              const actionsStore = db.createObjectStore('offline-actions', {
                keyPath: 'id',
                autoIncrement: true,
              });
              actionsStore.createIndex('timestamp', 'timestamp');
              actionsStore.createIndex('type', 'type');
            }

            // Cached equipment store
            if (!db.objectStoreNames.contains('cached-equipment')) {
              const equipmentStore = db.createObjectStore('cached-equipment', {
                keyPath: 'id',
              });
              equipmentStore.createIndex('lastCached', 'lastCached');
              equipmentStore.createIndex('status', 'status');
              equipmentStore.createIndex('category', 'category');
            }

            // Cached users store
            if (!db.objectStoreNames.contains('cached-users')) {
              const usersStore = db.createObjectStore('cached-users', {
                keyPath: 'id',
              });
              usersStore.createIndex('lastCached', 'lastCached');
            }
          },
        });
        setDb(database);
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
      }
    };

    initDB();
  }, []);

  // Monitor online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Load pending actions
  useEffect(() => {
    if (db) {
      loadPendingActions();
    }
  }, [db]);

  // Listen for service worker sync events
  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_SUCCESS') {
        loadPendingActions(); // Refresh pending actions
        setSyncStatus('idle');
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      };
    }
  }, []);

  const loadPendingActions = useCallback(async () => {
    if (!db) return;
    
    try {
      const actions = await db.getAll('offline-actions');
      setPendingActions(actions);
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }, [db]);

  // Cache equipment data
  const cacheEquipment = useCallback(async (equipment: any[]) => {
    if (!db) return;

    try {
      const tx = db.transaction('cached-equipment', 'readwrite');
      const store = tx.objectStore('cached-equipment');

      for (const item of equipment) {
        await store.put({
          ...item,
          lastCached: Date.now(),
        });
      }

      await tx.done;
    } catch (error) {
      console.error('Failed to cache equipment:', error);
    }
  }, [db]);

  // Get cached equipment
  const getCachedEquipment = useCallback(async (): Promise<CachedEquipment[]> => {
    if (!db) return [];

    try {
      return await db.getAll('cached-equipment');
    } catch (error) {
      console.error('Failed to get cached equipment:', error);
      return [];
    }
  }, [db]);

  // Cache user data
  const cacheUsers = useCallback(async (users: any[]) => {
    if (!db) return;

    try {
      const tx = db.transaction('cached-users', 'readwrite');
      const store = tx.objectStore('cached-users');

      for (const user of users) {
        await store.put({
          ...user,
          lastCached: Date.now(),
        });
      }

      await tx.done;
    } catch (error) {
      console.error('Failed to cache users:', error);
    }
  }, [db]);

  // Add offline action to queue
  const queueOfflineAction = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    if (!db) return false;

    try {
      const fullAction: OfflineAction = {
        ...action,
        timestamp: Date.now(),
      };

      await db.add('offline-actions', fullAction);
      await loadPendingActions();
      
      return true;
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      return false;
    }
  }, [db, loadPendingActions]);

  // Update equipment offline
  const updateEquipmentOffline = useCallback(async (
    id: string, 
    updates: Partial<CachedEquipment>
  ) => {
    if (!db) return false;

    try {
      // Update cached equipment
      const tx = db.transaction('cached-equipment', 'readwrite');
      const store = tx.objectStore('cached-equipment');
      const existing = await store.get(id);

      if (existing) {
        await store.put({
          ...existing,
          ...updates,
          lastCached: Date.now(),
        });
      }

      await tx.done;

      // Queue the action for sync
      if (!isOnline) {
        await queueOfflineAction({
          type: 'equipment-update',
          data: { id, ...updates },
          url: `/api/equipment/${id}`,
          method: 'PUT',
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to update equipment offline:', error);
      return false;
    }
  }, [db, queueOfflineAction, isOnline]);

  // Add maintenance log offline
  const addMaintenanceLogOffline = useCallback(async (maintenanceData: any) => {
    if (!isOnline) {
      return await queueOfflineAction({
        type: 'maintenance-log',
        data: maintenanceData,
        url: '/api/maintenance',
        method: 'POST',
      });
    }
    return false;
  }, [queueOfflineAction, isOnline]);

  // Manual sync attempt
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return false;

    setSyncStatus('syncing');

    try {
      for (const action of pendingActions) {
        const response = await fetch(action.url, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(action.data),
        });

        if (response.ok && db && action.id) {
          await db.delete('offline-actions', action.id);
        }
      }

      await loadPendingActions();
      setSyncStatus('idle');
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      return false;
    }
  }, [isOnline, pendingActions, db, loadPendingActions]);

  // Clear old cached data
  const clearOldCache = useCallback(async (maxAgeHours: number = 24) => {
    if (!db) return;

    const maxAge = Date.now() - (maxAgeHours * 60 * 60 * 1000);

    try {
      // Clear old equipment cache
      const equipmentTx = db.transaction('cached-equipment', 'readwrite');
      const equipmentStore = equipmentTx.objectStore('cached-equipment');
      const equipmentIndex = equipmentStore.index('lastCached');
      
      let cursor = await equipmentIndex.openCursor(IDBKeyRange.upperBound(maxAge));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }

      // Clear old user cache
      const usersTx = db.transaction('cached-users', 'readwrite');
      const usersStore = usersTx.objectStore('cached-users');
      const usersIndex = usersStore.index('lastCached');
      
      let usersCursor = await usersIndex.openCursor(IDBKeyRange.upperBound(maxAge));
      while (usersCursor) {
        await usersCursor.delete();
        usersCursor = await usersCursor.continue();
      }

      await Promise.all([equipmentTx.done, usersTx.done]);
    } catch (error) {
      console.error('Failed to clear old cache:', error);
    }
  }, [db]);

  // Get cache statistics
  const getCacheStats = useCallback(async () => {
    if (!db) return null;

    try {
      const [equipmentCount, usersCount, actionsCount] = await Promise.all([
        db.count('cached-equipment'),
        db.count('cached-users'),
        db.count('offline-actions'),
      ]);

      return {
        cachedEquipment: equipmentCount,
        cachedUsers: usersCount,
        pendingActions: actionsCount,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }, [db]);

  return {
    isOnline,
    pendingActions,
    syncStatus,
    
    // Equipment methods
    cacheEquipment,
    getCachedEquipment,
    updateEquipmentOffline,
    
    // User methods
    cacheUsers,
    
    // Offline action methods
    queueOfflineAction,
    addMaintenanceLogOffline,
    syncPendingActions,
    
    // Cache management
    clearOldCache,
    getCacheStats,
  };
}