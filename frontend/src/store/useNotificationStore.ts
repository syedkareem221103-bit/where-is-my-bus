import { create } from 'zustand';
import type { NotificationPayload } from '../types/notification.types';

export interface InternalNotification extends NotificationPayload {
  read: boolean;
}

interface NotificationState {
  notifications: InternalNotification[];

  addNotification: (payload: NotificationPayload) => boolean; // returns true if newly added/updated
  markAsRead: (notificationId: string) => void;
  removeNotification: (notificationId: string) => void;
  clearExpired: () => void;
  clearAll: () => void;
}

const MAX_NOTIFICATIONS = 200;
const ETA_COLLAPSE_WINDOW_MS = 30000; // 30 seconds

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (payload) => {
    const state = get();
    const existingIndex = state.notifications.findIndex(n => n.notificationId === payload.notificationId);

    if (existingIndex !== -1) {
      return false; // Deduplication
    }

    let nextList = [...state.notifications];

    // Collapsing logic for ETA
    if (payload.category === 'ETA') {
      const recentEtaIndex = nextList.findIndex(n => 
        n.category === 'ETA' && 
        n.tripId === payload.tripId &&
        (payload.timestamp - n.timestamp) < ETA_COLLAPSE_WINDOW_MS
      );
      if (recentEtaIndex !== -1) {
        // Replace the older ETA notification
        nextList[recentEtaIndex] = { ...payload, read: false };
      } else {
        nextList.push({ ...payload, read: false });
      }
    } else {
      nextList.push({ ...payload, read: false });
    }

    // Chronological Sort: lowest timestamp first (or highest first? Usually highest first for a feed)
    // Let's sort highest timestamp first (newest at the top)
    nextList.sort((a, b) => {
      if (b.timestamp === a.timestamp) {
        return b.notificationId.localeCompare(a.notificationId);
      }
      return b.timestamp - a.timestamp;
    });

    // Enforce 200 item cap
    if (nextList.length > MAX_NOTIFICATIONS) {
      // Find oldest read or expired first
      const now = Date.now();
      const removableIndexes = nextList
        .map((n, i) => ({ index: i, score: (n.read || n.expiresAt < now) ? 1 : 0 }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.index - a.index; // Prefer removing higher index (older item)
        });
      
      const toRemove = removableIndexes.slice(0, nextList.length - MAX_NOTIFICATIONS).map(r => r.index);
      nextList = nextList.filter((_, i) => !toRemove.includes(i));
      
      // Fallback: If still over 200 (meaning all 200 are unread and unexpired), just truncate the oldest (end of array)
      if (nextList.length > MAX_NOTIFICATIONS) {
        nextList = nextList.slice(0, MAX_NOTIFICATIONS);
      }
    }

    set({ notifications: nextList });
    return true;
  },

  markAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.notificationId === notificationId ? { ...n, read: true } : n
    )
  })),

  removeNotification: (notificationId) => set((state) => ({
    notifications: state.notifications.filter(n => n.notificationId !== notificationId)
  })),

  clearExpired: () => set((state) => {
    const now = Date.now();
    return {
      notifications: state.notifications.filter(n => n.expiresAt > now)
    };
  }),

  clearAll: () => set({ notifications: [] })
}));
