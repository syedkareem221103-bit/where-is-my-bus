import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDriverRankings } from '@/hooks/analytics/useDriverAnalytics';
import { useDriverAnalyticsStore } from '@/store/useDriverAnalyticsStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const DriverComparisonChart: React.FC = () => {
  const timeRange = useDriverAnalyticsStore(state => state.timeRange);
  const { data: rankings } = useDriverRankings(timeRange);

  if (!rankings || rankings.length === 0) {
    return null;
  }

  // Take top 5 and bottom 5 to visualize the spread
  const top5 = rankings.slice(0, 5);
  // Bottom 5 might overlap if less than 10 total
  const chartData = top5.map(d => ({
    name: d.driverName,
    Score: d.driverScore,
    Punctuality: d.onTimeArrivalPct
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Score" fill="#3b82f6" />
              <Bar dataKey="Punctuality" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
