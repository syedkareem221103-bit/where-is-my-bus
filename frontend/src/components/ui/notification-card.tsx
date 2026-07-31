import { Card, CardContent } from '@/components/ui/card';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/utils';

export type NotificationType = 'info' | 'warning' | 'alert';

interface NotificationCardProps {
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead?: boolean;
}

export function NotificationCard({ type, title, message, time, isRead = false }: NotificationCardProps) {
  const config = {
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    alert: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  const { icon: Icon, color, bg } = config[type];

  return (
    <Card className={cn("transition-colors hover:bg-muted/30 cursor-pointer", !isRead && "border-l-4 border-l-primary")}>
      <CardContent className="p-4 flex gap-4">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className={cn("text-sm font-semibold", !isRead ? "text-foreground" : "text-muted-foreground")}>{title}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{time}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
