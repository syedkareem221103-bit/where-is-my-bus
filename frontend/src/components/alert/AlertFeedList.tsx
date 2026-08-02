import React from 'react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../../hooks/alert/useAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const AlertFeedList: React.FC = () => {
  const { data: alerts, isLoading, error } = useAlerts();
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  if (isLoading) return <div>Loading alerts...</div>;
  if (error) return <div>Error loading alerts.</div>;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="text-red-500" />
          Smart Alerts Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts?.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No active alerts.</p>
        ) : (
          <div className="space-y-4">
            {alerts?.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 border rounded-lg flex items-center justify-between ${
                  alert.priority === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                  alert.priority === 'HIGH' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{alert.category.replace('_', ' ')}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      alert.status === 'ACTIVE' ? 'bg-red-200 text-red-800' :
                      alert.status === 'ACKNOWLEDGED' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {alert.status === 'ACTIVE' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      Acknowledge
                    </Button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <Button 
                      size="sm"
                      onClick={() => resolveMutation.mutate({ id: alert.id, notes: 'Resolved by operator' })}
                      disabled={resolveMutation.isPending}
                    >
                      <CheckCircle size={16} className="mr-1" /> Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
