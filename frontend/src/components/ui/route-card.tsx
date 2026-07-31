import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, Clock, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RouteCardProps {
  routeName: string;
  startLocation: string;
  endLocation: string;
  estimatedTime: string;
  isActive?: boolean;
}

export function RouteCard({ routeName, startLocation, endLocation, estimatedTime, isActive }: RouteCardProps) {
  return (
    <Card className={isActive ? 'border-primary shadow-sm' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            {routeName}
          </CardTitle>
          {isActive && <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">Active</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative pl-6 space-y-4 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-muted">
          <div className="relative">
            <div className="absolute left-[-24px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
            <p className="text-sm font-medium">{startLocation}</p>
            <p className="text-xs text-muted-foreground">Start Point</p>
          </div>
          <div className="relative">
            <div className="absolute left-[-24px] top-1 h-3 w-3 rounded-full bg-muted-foreground ring-4 ring-background" />
            <p className="text-sm font-medium">{endLocation}</p>
            <p className="text-xs text-muted-foreground">End Point</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-1" />
            {estimatedTime}
          </div>
          <Button variant={isActive ? "default" : "outline"} size="sm">
            <Navigation className="w-4 h-4 mr-1" />
            {isActive ? 'Resume Route' : 'Start Route'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
