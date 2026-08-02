import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, ShieldAlert, CheckCircle } from 'lucide-react';
import { useDriverRankings } from '@/hooks/analytics/useDriverAnalytics';
import { useDriverAnalyticsStore } from '@/store/useDriverAnalyticsStore';

export const KPIGrid: React.FC = () => {
  const timeRange = useDriverAnalyticsStore(state => state.timeRange);
  const { data: rankings } = useDriverRankings(timeRange);

  const averageScore = rankings?.length ? (rankings.reduce((sum, k) => sum + k.driverScore, 0) / rankings.length).toFixed(1) : '-';
  const averageOnTime = rankings?.length ? (rankings.reduce((sum, k) => sum + k.onTimeArrivalPct, 0) / rankings.length).toFixed(1) + '%' : '-';
  const totalTrips = rankings?.length ? rankings.reduce((sum, k) => sum + k.completedTrips, 0) : '-';
  const totalEmergencies = rankings?.length ? rankings.reduce((sum, k) => sum + k.emergencyIncidents, 0) : '-';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Fleet Score</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageScore}</div>
          <p className="text-xs text-muted-foreground">Out of 100</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg On-Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageOnTime}</div>
          <p className="text-xs text-muted-foreground">Arrival punctuality</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Trips</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTrips}</div>
          <p className="text-xs text-muted-foreground">Across all active drivers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Safety Incidents</CardTitle>
          <ShieldAlert className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalEmergencies}</div>
          <p className="text-xs text-muted-foreground">Emergency events recorded</p>
        </CardContent>
      </Card>
    </div>
  );
};
