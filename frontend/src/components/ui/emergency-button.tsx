import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';

interface EmergencyButtonProps {
  onClick?: () => void;
  className?: string;
}

export function EmergencyButton({ onClick, className }: EmergencyButtonProps) {
  return (
    <Button 
      variant="destructive" 
      size="lg"
      className={cn("w-full h-16 text-lg font-bold shadow-lg flex items-center justify-center gap-3", className)}
      onClick={onClick}
    >
      <AlertTriangle className="w-7 h-7" />
      TRIGGER SOS
    </Button>
  );
}
