import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Map, CheckCircle } from 'lucide-react';
import { useRouteRankings } from '@/hooks/analytics/useRouteAnalytics';
import { useRouteAnalyticsStore } from '@/store/useRouteAnalyticsStore';

export const RouteKPIGrid: React.FC = () => {
  const { timeRange, sortBy, sortOrder } = useRouteAnalyticsStore();
  const { data: routes, isLoading } = useRouteRankings(timeRange, sortBy, sortOrder);

  if (isLoading || !routes) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">Loading...</div>;
  }

  const validRoutes = routes.filter(r => r.routeCompletionRate > 0);
  
  const avgEfficiency = validRoutes.length 
    ? validRoutes.reduce((acc, curr) => acc + curr.efficiencyScore, 0) / validRoutes.length 
    : 0;
    
  const avgTimeDeviation = validRoutes.length 
    ? validRoutes.reduce((acc, curr) => acc + curr.timeDeviationMins, 0) / validRoutes.length 
    : 0;

  const avgDistanceDeviation = validRoutes.length 
    ? validRoutes.reduce((acc, curr) => acc + curr.distanceDeviationPct, 0) / validRoutes.length 
    : 0;

  const avgStopCompliance = validRoutes.length 
    ? validRoutes.reduce((acc, curr) => acc + curr.stopCompliancePct, 0) / validRoutes.length 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Route Efficiency</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgEfficiency.toFixed(1)}/100</div>
          <p className="text-xs text-muted-foreground">Network-wide average</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Time Deviation</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgTimeDeviation > 0 ? '+' : ''}{avgTimeDeviation.toFixed(1)} mins</div>
          <p className="text-xs text-muted-foreground">From scheduled planned duration</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Distance Deviation</CardTitle>
          <Map className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgDistanceDeviation > 0 ? '+' : ''}{avgDistanceDeviation.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Actual vs. planned distance</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stop Compliance</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgStopCompliance.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Mandatory stops visited</p>
        </CardContent>
      </Card>
    </div>
  );
};
