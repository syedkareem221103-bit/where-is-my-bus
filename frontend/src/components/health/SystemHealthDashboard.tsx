import React from 'react';
import { useSystemHealth } from '../../hooks/health/useSystemHealth';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Activity, Server, Database, Cpu } from 'lucide-react';

export const SystemHealthDashboard: React.FC = () => {
  const { data: health, isLoading, error } = useSystemHealth();

  if (isLoading) return <div>Loading System Health...</div>;
  if (error || !health) return <div>Error loading system health</div>;

  const statusColors = {
    HEALTHY: 'bg-green-500',
    WARNING: 'bg-yellow-500',
    DEGRADED: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
    OFFLINE: 'bg-gray-800'
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Global Status Banner */}
      <div className={`${statusColors[health.globalStatus]} text-white p-6 rounded-lg shadow-lg flex items-center justify-between`}>
        <div>
          <h2 className="text-2xl font-bold">Global System Status: {health.globalStatus}</h2>
          <p className="text-sm opacity-90 mt-1">Last Updated: {new Date(health.timestamp).toLocaleTimeString()}</p>
        </div>
        <Activity size={48} className="opacity-80" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Infrastructure */}
        {health.infrastructure && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database size={20} /> Infrastructure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">PostgreSQL</span>
                <span className={`px-2 py-1 rounded text-xs font-bold text-white ${statusColors[health.infrastructure.postgres.status as keyof typeof statusColors]}`}>
                  {health.infrastructure.postgres.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Redis</span>
                <span className={`px-2 py-1 rounded text-xs font-bold text-white ${statusColors[health.infrastructure.redis.status as keyof typeof statusColors]}`}>
                  {health.infrastructure.redis.status}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Runtime Metrics */}
        {health.runtime && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cpu size={20} /> Runtime Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>CPU Usage</span>
                <span className="font-mono">{health.runtime.cpu}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Memory Usage</span>
                <span className="font-mono">{health.runtime.memory}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Event Loop Delay</span>
                <span className="font-mono">{health.runtime.eventLoopDelay.toFixed(2)} ms</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Server size={20} /> Domain Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(health.services).length === 0 ? (
              <p className="text-gray-500 text-sm">No services registered.</p>
            ) : (
              Object.entries(health.services).map(([name, service]) => (
                <div key={name} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <span className="text-sm font-medium">{name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${statusColors[service.status as keyof typeof statusColors]}`}>
                    {service.status}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
