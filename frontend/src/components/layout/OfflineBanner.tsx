import { WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  // Optional: placeholder for last sync time
  const lastSyncTime = "10:30 AM";

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="w-full bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between shadow-md relative z-50">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">You are currently offline</span>
          <span className="text-xs opacity-90">Last synced: {lastSyncTime}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-destructive-foreground/20" onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}
