import { useEffect, useRef } from 'react';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import { socketClient } from '../../services/realtime/socketClient';
import { useSocketStore } from '../../store/useSocketStore';
import type { AttendanceAck } from '../../types/attendance.types';

export function useAttendanceSync() {
  const offlineQueue = useAttendanceStore(state => state.offlineQueue);
  const dequeueOffline = useAttendanceStore(state => state.dequeueOffline);
  const isConnected = useSocketStore(state => state.status) === 'CONNECTED';
  
  const isSyncing = useRef(false);

  useEffect(() => {
    let mounted = true;

    const flushQueue = async () => {
      if (isSyncing.current || offlineQueue.length === 0 || !isConnected) return;
      
      isSyncing.current = true;

      // Strict FIFO execution
      for (const payload of offlineQueue) {
        if (!mounted || !isConnected) break; // Halt if unmounted or connection lost

        try {
          const ack = await new Promise<AttendanceAck>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
            
            socketClient.getSocket()?.emit('client:attendance:mark', payload, (response: AttendanceAck) => {
              clearTimeout(timeout);
              resolve(response);
            });
          });

          if (ack.success || ack.duplicate) {
            // Successfully processed or already processed
            dequeueOffline(payload.eventId);
          } else {
            // Backend explicitly rejected it (e.g., invalid transition)
            // Drop it so it doesn't block the queue forever
            dequeueOffline(payload.eventId);
          }

        } catch {
          // Network failure or timeout -> immediately halt to preserve FIFO and wait for next interval
          break; 
        }
      }

      isSyncing.current = false;
    };

    // Attempt flush immediately if conditions change, or periodically
    flushQueue();
    const intervalId = setInterval(flushQueue, 3000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [offlineQueue, isConnected, dequeueOffline]);
}
