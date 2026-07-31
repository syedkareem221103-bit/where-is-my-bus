import { useEffect, useRef, useState } from 'react';

/**
 * Optional optimization hook to keep the screen awake using the Screen Wake Lock API.
 * Not all browsers support this (e.g. Firefox), so it fails gracefully.
 */
export function useWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isSupported] = useState(() => 'wakeLock' in navigator);

  useEffect(() => {
    let mounted = true;

    const requestWakeLock = async () => {
      if (!isSupported || !isActive) return;
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        
        wakeLockRef.current.addEventListener('release', () => {
          // It can be released by the system (e.g. battery saver)
          if (mounted && isActive) {
            // Re-request if we still need it
            requestWakeLock();
          }
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release().catch(console.warn);
        wakeLockRef.current = null;
      }
    };

    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Handle visibility changes (wake lock is automatically released when tab is hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isActive, isSupported]);

  return { isSupported };
}
