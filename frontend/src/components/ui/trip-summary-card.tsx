import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, Clock, Navigation } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';

interface TripSummaryCardProps {
  routeName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  eta: string;
  progressPercentage: number;
}

export function TripSummaryCard({ routeName, status, eta, progressPercentage }: TripSummaryCardProps) {
  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden">
      <div className="h-1.5 w-full bg-secondary">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-in-out" 
          style={{ width: `${progressPercentage}%` }} 
        />
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            {routeName}
          </CardTitle>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-muted-foreground">
            <Navigation className="w-4 h-4 mr-2" />
            Status: <span className="font-semibold text-foreground ml-1">{progressPercentage > 0 ? 'En Route' : 'Scheduled'}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            ETA: <span className="font-bold text-foreground ml-1">{eta}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
