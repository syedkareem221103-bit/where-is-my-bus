import React from 'react';
import { useRouteRankings } from '@/hooks/analytics/useRouteAnalytics';
import { useRouteAnalyticsStore } from '@/store/useRouteAnalyticsStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export const RouteLeaderboard: React.FC = () => {
  const { timeRange, sortBy, sortOrder } = useRouteAnalyticsStore();
  const { data: routes, isLoading } = useRouteRankings(timeRange, sortBy, sortOrder);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No route data available for this time range.
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/10 text-green-700 hover:bg-green-500/20';
    if (score >= 75) return 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20';
    return 'bg-red-500/10 text-red-700 hover:bg-red-500/20';
  };

  const getDelayColor = (delay: number) => {
    if (delay <= 0) return 'text-green-600';
    if (delay <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Route Efficiency Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route Name</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Distance Deviation</TableHead>
              <TableHead className="text-right">Avg Time Delay</TableHead>
              <TableHead className="text-right">Avg Speed (km/h)</TableHead>
              <TableHead className="text-right">Completion Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.routeId}>
                <TableCell className="font-medium">{route.routeName}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={getScoreColor(route.efficiencyScore)}>
                    {route.efficiencyScore.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className={route.distanceDeviationPct > 10 ? 'text-red-600 font-medium' : ''}>
                    {route.distanceDeviationPct > 0 ? '+' : ''}{route.distanceDeviationPct.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className={`text-right font-medium ${getDelayColor(route.timeDeviationMins)}`}>
                  {route.timeDeviationMins > 0 ? '+' : ''}{route.timeDeviationMins.toFixed(1)} min
                </TableCell>
                <TableCell className="text-right">{route.averageVehicleSpeed.toFixed(1)}</TableCell>
                <TableCell className="text-right">{route.routeCompletionRate.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
