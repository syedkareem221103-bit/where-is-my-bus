import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/utils';

type StatusType = 'success' | 'warning' | 'destructive' | 'default' | 'info';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  className?: string;
}

const statusConfig: Record<string, StatusType> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
  suspended: 'destructive',
  maintenance: 'warning',
  completed: 'success',
  in_progress: 'info',
};

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(' ', '_');
  const badgeType = type || statusConfig[normalizedStatus] || 'default';

  const typeStyles = {
    success: 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400',
    destructive: 'bg-destructive/15 text-destructive hover:bg-destructive/25 dark:text-destructive',
    info: 'bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:text-blue-400',
    default: 'bg-muted text-muted-foreground hover:bg-muted/80',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("border-transparent font-medium capitalize", typeStyles[badgeType], className)}
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}
