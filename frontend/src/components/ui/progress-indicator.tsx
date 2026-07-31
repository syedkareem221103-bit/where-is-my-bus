import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label: string;
}

export function ProgressIndicator({ current, total, label }: ProgressIndicatorProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-muted-foreground">{percentage}% ({current}/{total})</span>
      </div>
      <Progress value={percentage} className="h-3" />
    </div>
  );
}
