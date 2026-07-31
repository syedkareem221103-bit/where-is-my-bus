import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, UserMinus, Bus } from 'lucide-react';
import { cn } from '@/utils/utils';

export type AttendanceState = 'boarded' | 'dropped' | 'absent' | 'pending';

interface AttendanceStatusCardProps {
  status: AttendanceState;
  timestamp?: string;
}

export function AttendanceStatusCard({ status, timestamp }: AttendanceStatusCardProps) {
  const config = {
    boarded: { icon: Bus, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Boarded the Bus' },
    dropped: { icon: UserCheck, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Dropped at School' },
    absent: { icon: UserMinus, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Marked Absent' },
    pending: { icon: Bus, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Waiting for Pickup' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <Card className={cn("border", bg.replace('/10', '/30'))}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", bg)}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div>
          <p className={cn("text-lg font-bold", color)}>{label}</p>
          {timestamp && <p className="text-xs text-muted-foreground mt-0.5">{timestamp}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
