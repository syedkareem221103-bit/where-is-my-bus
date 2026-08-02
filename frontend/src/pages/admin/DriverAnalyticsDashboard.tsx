import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { KPIGrid } from '@/components/analytics/driver/KPIGrid';
import { DriverRankingsBoard } from '@/components/analytics/driver/DriverRankingsBoard';
import { DriverComparisonChart } from '@/components/analytics/driver/DriverComparisonChart';
import { useDriverAnalyticsStore } from '@/store/useDriverAnalyticsStore';


export const DriverAnalyticsDashboard: React.FC = () => {
  const { timeRange, setTimeRange } = useDriverAnalyticsStore();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Driver Performance Analytics" 
          description="Measure driver productivity, safety, and operational efficiency." 
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

      <KPIGrid />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DriverRankingsBoard />
        <DriverComparisonChart />
      </div>
    </div>
  );
};
