import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/utils';

interface QuickActionCardProps {
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function QuickActionCard({ title, icon: Icon, onClick, className }: QuickActionCardProps) {
  return (
    <Card 
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors active:scale-95",
        className
      )}
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <span className="text-sm font-medium">{title}</span>
    </Card>
  );
}
