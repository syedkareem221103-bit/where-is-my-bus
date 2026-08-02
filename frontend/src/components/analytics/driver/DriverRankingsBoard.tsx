import React from 'react';
import { useDriverRankings } from '@/hooks/analytics/useDriverAnalytics';
import { useDriverAnalyticsStore } from '@/store/useDriverAnalyticsStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export const DriverRankingsBoard: React.FC = () => {
  const timeRange = useDriverAnalyticsStore(state => state.timeRange);
  const { data: rankings, isLoading } = useDriverRankings(timeRange);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500 h-64 flex items-center justify-center">
          No driver performance data available for this period.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Driver Name</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Trips</TableHead>
              <TableHead>On-Time %</TableHead>
              <TableHead>Safety Events</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((kpi, index) => (
              <TableRow key={kpi.driverId}>
                <TableCell className="font-medium">#{index + 1}</TableCell>
                <TableCell>{kpi.driverName}</TableCell>
                <TableCell>
                  <Badge variant={kpi.driverScore >= 80 ? 'default' : kpi.driverScore >= 50 ? 'secondary' : 'destructive'}>
                    {kpi.driverScore.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell>{kpi.completedTrips}</TableCell>
                <TableCell>{kpi.onTimeArrivalPct.toFixed(1)}%</TableCell>
                <TableCell>{kpi.emergencyIncidents}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
