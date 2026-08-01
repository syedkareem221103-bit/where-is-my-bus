import React from 'react';
import { useFleetStore } from '../../../../store/useFleetStore';
import { AlertTriangle, X } from 'lucide-react';

export const EmergencyPanel: React.FC = () => {
  const { alerts, removeAlert } = useFleetStore();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-md shadow-sm mb-6 max-h-64 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">Critical Alerts</h2>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const timeString = new Date(alert.timestamp || '2023-01-01T00:00:00Z').toLocaleTimeString();
          return (
          <div key={alert.id || index} className="flex justify-between items-start bg-white dark:bg-card p-3 rounded border shadow-sm">
            <div>
              <p className="font-medium text-sm">
                {alert.title || 'Emergency Update'} 
                <span className="text-xs text-muted-foreground ml-2">
                  {timeString}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">{alert.message || JSON.stringify(alert)}</p>
            </div>
            <button 
              onClick={() => removeAlert(alert.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Acknowledge Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
};
