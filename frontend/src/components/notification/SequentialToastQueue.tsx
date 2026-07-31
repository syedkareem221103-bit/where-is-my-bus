import React, { useEffect, useState } from 'react';
import { useNotificationStore, type InternalNotification } from '../../store/useNotificationStore';

export const SequentialToastQueue: React.FC = () => {
  const notifications = useNotificationStore(state => state.notifications);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const [isVisible, setIsVisible] = useState(document.visibilityState === 'visible');

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Derive active toast directly from state
  let activeToast: InternalNotification | null = null;
  if (isVisible) {
    const eligibleToasts = notifications.filter(
      n => !n.read && (n.priority === 'HIGH' || n.priority === 'CRITICAL')
    );

    if (eligibleToasts.length > 0) {
      eligibleToasts.sort((a, b) => {
        if (a.priority === 'CRITICAL' && b.priority !== 'CRITICAL') return -1;
        if (a.priority !== 'CRITICAL' && b.priority === 'CRITICAL') return 1;
        return a.timestamp - b.timestamp;
      });
      activeToast = eligibleToasts[0];
    }
  }

  const handleDismiss = () => {
    if (activeToast) {
      markAsRead(activeToast.notificationId);
    }
  };

  if (!activeToast) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full"
      aria-live={activeToast.priority === 'CRITICAL' ? 'assertive' : 'polite'}
    >
      <div 
        className={`p-4 rounded-lg shadow-lg border ${
          activeToast.priority === 'CRITICAL' 
            ? 'bg-red-50 border-red-200 text-red-900' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        role="alert"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-sm">{activeToast.title}</h3>
            <p className="text-sm mt-1">{activeToast.body}</p>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-sm"
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
};
