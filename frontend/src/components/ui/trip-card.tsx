import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Users, Clock } from 'lucide-react';
import { StatusBadge } from './status-badge';

interface TripCardProps {
  title: string;
  time: string;
  studentCount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

export function TripCard({ title, time, studentCount, status }: TripCardProps) {
  return (
    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {time}
            </span>
            <span className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {studentCount} Students
            </span>
          </div>
        </div>
        <div>
          <StatusBadge status={status} />
        </div>
      </CardContent>
    </Card>
  );
}
