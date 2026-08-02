import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, Map as MapIcon } from 'lucide-react';
import { useRouteReplay } from '@/hooks/analytics/useRouteAnalytics';

interface ReplayMapProps {
  tripId?: string;
}

export const HistoricalTripReplayMap: React.FC<ReplayMapProps> = ({ tripId }) => {
  const { data: replay, isLoading } = useRouteReplay(tripId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying && replay?.pings?.length) {
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= replay.pings.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, replay, speed]);

  if (!tripId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Historical Trip Replay</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
          <MapIcon className="h-12 w-12 mb-4 opacity-20" />
          <p>Select a trip to view the GPS replay</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-[400px]">
          Loading replay data...
        </CardContent>
      </Card>
    );
  }

  if (!replay || !replay.pings || replay.pings.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-[400px]">
          No GPS data available for this trip.
        </CardContent>
      </Card>
    );
  }

  const currentPing = replay.pings[progress];
  const progressPct = (progress / (replay.pings.length - 1)) * 100;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Trip Replay: {replay.routeName}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Driver: {replay.driverName} | Vehicle: {replay.vehicleNumber}
        </p>
      </CardHeader>
      <CardContent>
        {/* Mock Map Area */}
        <div className="relative w-full h-[300px] bg-slate-100 rounded-md mb-4 overflow-hidden border border-slate-200">
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <MapIcon className="h-24 w-24 text-slate-400" />
          </div>
          {/* Mock Marker */}
          <div 
            className="absolute h-4 w-4 bg-primary rounded-full shadow-lg border-2 border-white transition-all duration-300"
            style={{
              left: `${10 + (progressPct * 0.8)}%`, // Mock movement across X axis
              top: `${50 + (Math.sin(progressPct / 10) * 20)}%` // Mock movement across Y axis curve
            }}
          />
          {/* Telemetry overlay */}
          <div className="absolute bottom-2 left-2 bg-white/90 p-2 rounded text-xs shadow">
            <p><strong>Speed:</strong> {currentPing.speed} km/h</p>
            <p><strong>Time:</strong> {new Date(currentPing.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col space-y-4">
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300" 
              style={{ width: `${progressPct}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={() => setProgress(0)}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="default" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex space-x-2">
              {[1, 2, 4, 10].map(s => (
                <Button 
                  key={s} 
                  variant={speed === s ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
