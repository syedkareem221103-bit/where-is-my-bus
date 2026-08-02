import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouteRankings } from '@/hooks/analytics/useRouteAnalytics';
import { useRouteAnalyticsStore } from '@/store/useRouteAnalyticsStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const EfficiencyTrendChart: React.FC = () => {
  const { timeRange, sortBy, sortOrder } = useRouteAnalyticsStore();
  const { data: routes } = useRouteRankings(timeRange, sortBy, sortOrder);

  if (!routes || routes.length === 0) return null;

  // We limit to top 10 routes for readability on the chart
  const chartData = routes.slice(0, 10).map(route => ({
    name: route.routeName,
    score: route.efficiencyScore,
    delay: route.timeDeviationMins,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Routes Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar yAxisId="left" dataKey="score" name="Efficiency Score" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar yAxisId="right" dataKey="delay" name="Time Delay (Mins)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
