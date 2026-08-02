import React, { useState } from 'react';
import { useFleetAnalytics } from '../../hooks/analytics/useFleetAnalytics';
import { KPICard } from '../../components/analytics/KPICard';
import { TripsCompletedChart } from '../../components/analytics/AnalyticsCharts';
import { Activity, Bus, AlertTriangle, Users, Clock, ShieldCheck, Map } from 'lucide-react';
import { Button } from '../../components/ui/button';

export const AnalyticsDashboard: React.FC = () => {
  const [filter] = useState(() => ({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString()
  }));

  const { liveKPIs, historicalKPIs, isLoading } = useFleetAnalytics(filter);

  // Merge completed/cancelled arrays for the chart
  const chartData = historicalKPIs?.dailyTripsCompleted.map((comp) => {
    const cancelled = historicalKPIs.dailyTripsCancelled.find(c => c.date === comp.date)?.count || 0;
    return {
      date: comp.date,
      completed: comp.count,
      cancelled
    };
  }) || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Fleet Analytics & Operational Intelligence</h2>
        <div className="flex items-center space-x-2">
          {/* Real-time Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium">Live Updates Active</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Live KPIs */}
        <h3 className="text-lg font-medium">Real-Time Operations</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Vehicles Active"
            value={liveKPIs?.vehiclesActive || 0}
            icon={Bus}
            description="Currently active vehicles on route"
          />
          <KPICard
            title="Active Emergencies"
            value={liveKPIs?.activeEmergencyCount || 0}
            icon={AlertTriangle}
            description="Ongoing reported emergencies"
          />
          <KPICard
            title="Fleet Utilization"
            value={`${liveKPIs?.fleetUtilizationPercent || 0}%`}
            icon={Activity}
            description="Percentage of fleet in use"
          />
          <KPICard
            title="Drivers Online"
            value={liveKPIs?.driversOnline || 0}
            icon={Users}
            description="Drivers connected and authenticated"
          />
        </div>

        {/* Historical KPIs */}
        <div className="flex items-center justify-between pt-4">
          <h3 className="text-lg font-medium">Historical Performance</h3>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Export Report</Button>
        </div>
        
        {isLoading ? (
          <div>Loading historical data...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Route Punctuality"
                value={`${historicalKPIs?.routePunctualityPercent || 0}%`}
                icon={Clock}
                trend={{ value: 2.1, isPositive: true }}
              />
              <KPICard
                title="Driver Safety Score"
                value={`${historicalKPIs?.driverSafetyScore || 0}/100`}
                icon={ShieldCheck}
                trend={{ value: 0.5, isPositive: true }}
              />
              <KPICard
                title="Attendance vs Capacity"
                value={`${historicalKPIs?.attendanceVsCapacityPercent || 0}%`}
                icon={Users}
                trend={{ value: 1.2, isPositive: false }}
              />
              <KPICard
                title="Average Idle Time"
                value={`${historicalKPIs?.averageIdleTimeMinutes || 0} mins`}
                icon={Map}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 pt-4">
              <div className="col-span-4">
                <TripsCompletedChart data={chartData} />
              </div>
              {/* Additional charts can go here */}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
