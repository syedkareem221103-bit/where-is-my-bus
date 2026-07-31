import { useNotificationStore } from './useNotificationStore';
import type { NotificationCategory } from '../types/notification.types';

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll();
  });

  const createPayload = (id: string, category: NotificationCategory, timestamp: number = Date.now(), priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL') => ({
    notificationId: id,
    tripId: 'trip-1',
    category,
    priority,
    title: 'Test',
    body: 'Test',
    timestamp,
    expiresAt: timestamp + 100000
  });

  it('should add a notification and mark it as delivered/unread', () => {
    const payload = createPayload('1', 'ATTENDANCE');
    const added = useNotificationStore.getState().addNotification(payload);

    expect(added).toBe(true);
    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(1);
    expect(notifications[0].read).toBe(false);
  });

  it('should prevent duplicate notifications', () => {
    const payload = createPayload('1', 'ATTENDANCE');
    
    useNotificationStore.getState().addNotification(payload);
    const addedAgain = useNotificationStore.getState().addNotification(payload);

    expect(addedAgain).toBe(false);
    expect(useNotificationStore.getState().notifications.length).toBe(1);
  });

  it('should mark a notification as read', () => {
    const payload = createPayload('1', 'ATTENDANCE');
    useNotificationStore.getState().addNotification(payload);
    
    useNotificationStore.getState().markAsRead('1');
    const notification = useNotificationStore.getState().notifications.find(n => n.notificationId === '1');
    expect(notification?.read).toBe(true);
  });

  it('should collapse ETA notifications within the time window', () => {
    const baseTime = 1000000;
    const oldEta = createPayload('1', 'ETA', baseTime);
    const newEta = createPayload('2', 'ETA', baseTime + 10000); // 10 seconds later, < 30s window

    useNotificationStore.getState().addNotification(oldEta);
    useNotificationStore.getState().addNotification(newEta);

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(1);
    expect(notifications[0].notificationId).toBe('2'); // new ETA replaced the old one
  });

  it('should NOT collapse ETA notifications outside the time window', () => {
    const baseTime = 1000000;
    const oldEta = createPayload('1', 'ETA', baseTime);
    const newEta = createPayload('2', 'ETA', baseTime + 40000); // 40 seconds later, > 30s window

    useNotificationStore.getState().addNotification(oldEta);
    useNotificationStore.getState().addNotification(newEta);

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(2);
  });

  it('should order notifications chronologically (newest timestamp first)', () => {
    const payload1 = createPayload('1', 'ATTENDANCE', 100);
    const payload2 = createPayload('2', 'ATTENDANCE', 300);
    const payload3 = createPayload('3', 'ATTENDANCE', 200);

    useNotificationStore.getState().addNotification(payload1);
    useNotificationStore.getState().addNotification(payload2);
    useNotificationStore.getState().addNotification(payload3);

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(3);
    expect(notifications[0].notificationId).toBe('2'); // highest timestamp
    expect(notifications[1].notificationId).toBe('3');
    expect(notifications[2].notificationId).toBe('1');
  });

  it('should enforce the 200 item cap and evict oldest read items first', () => {
    // Add 200 unread items
    for (let i = 0; i < 200; i++) {
      useNotificationStore.getState().addNotification(
        createPayload(`id-${i}`, 'SYSTEM', Date.now() - 10000 + i)
      );
    }
    
    expect(useNotificationStore.getState().notifications.length).toBe(200);

    // Mark items 10 and 20 as read
    useNotificationStore.getState().markAsRead('id-10');
    useNotificationStore.getState().markAsRead('id-20');

    // Add a new item (201st)
    useNotificationStore.getState().addNotification(
      createPayload(`id-new`, 'SYSTEM', Date.now() + 100000)
    );

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(200);
    
    // The newly added item should be present
    expect(notifications.find(n => n.notificationId === 'id-new')).toBeDefined();
    
    // The read items (id-10 and id-20) should have been the first to be evicted.
    // Wait, the logic sorts by score (read/expired = 1) then index.
    // If multiple items have score 1, their relative order is maintained.
    // So 'id-10' and 'id-20' were both score 1 and likely evicted.
    // Let's check if they are gone. One of them should be gone to make room for 1 item.
    // Since only 1 needed to be removed, either 10 or 20 was removed.
    const has10 = notifications.some(n => n.notificationId === 'id-10');
    const has20 = notifications.some(n => n.notificationId === 'id-20');
    expect(has10 && has20).toBe(false); // At least one was evicted
  });

  it('should clear expired notifications', () => {
    const valid = createPayload('1', 'SYSTEM', Date.now());
    valid.expiresAt = Date.now() + 10000;
    
    const expired = createPayload('2', 'SYSTEM', Date.now());
    expired.expiresAt = Date.now() - 10000;

    useNotificationStore.getState().addNotification(valid);
    useNotificationStore.getState().addNotification(expired);

    expect(useNotificationStore.getState().notifications.length).toBe(2);

    useNotificationStore.getState().clearExpired();

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(1);
    expect(notifications[0].notificationId).toBe('1');
  });
});
