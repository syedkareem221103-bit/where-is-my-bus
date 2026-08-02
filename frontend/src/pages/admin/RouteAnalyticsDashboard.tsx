import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { RouteKPIGrid } from '@/components/analytics/route/RouteKPIGrid';
import { RouteLeaderboard } from '@/components/analytics/route/RouteLeaderboard';
import { EfficiencyTrendChart } from '@/components/analytics/route/EfficiencyTrendChart';
import { HistoricalTripReplayMap } from '@/components/analytics/route/HistoricalTripReplayMap';
import { useRouteAnalyticsStore } from '@/store/useRouteAnalyticsStore';

export const RouteAnalyticsDashboard: React.FC = () => {
  const { timeRange, setTimeRange } = useRouteAnalyticsStore();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <PageHeader 
          title="Route Optimization & Efficiency" 
          description="Analyze historical route performance, deviations, and GPS replays." 
        />
        <div className="w-48">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <RouteKPIGrid />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-1 lg:col-span-4">
          <RouteLeaderboard />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <EfficiencyTrendChart />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 mt-4">
        <HistoricalTripReplayMap />
      </div>
    </div>
  );
};
