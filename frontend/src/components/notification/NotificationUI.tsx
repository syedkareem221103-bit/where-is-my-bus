import React, { useState } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';

export const NotificationBell: React.FC = () => {
  const notifications = useNotificationStore(state => state.notifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <button className="relative p-2 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full" aria-label="Notifications">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export const NotificationCenter: React.FC = () => {
  const notifications = useNotificationStore(state => state.notifications);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>
        <NotificationBell />
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-slate-200">
          <div className="py-2 bg-slate-50 px-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.notificationId} 
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => markAsRead(notification.notificationId)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold ${notification.priority === 'CRITICAL' ? 'text-red-600' : 'text-blue-600'}`}>
                      {notification.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className={`text-sm ${!notification.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{notification.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{notification.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
