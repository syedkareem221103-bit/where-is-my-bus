import { Card, CardContent } from '@/components/ui/card';
import { Bus, Hash } from 'lucide-react';

interface BusInfoCardProps {
  busNumber: string;
  plate: string;
  color?: string;
}

export function BusInfoCard({ busNumber, plate, color = 'Yellow' }: BusInfoCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Bus #{busNumber}</p>
            <p className="text-xs text-muted-foreground">{color} • {plate}</p>
          </div>
        </div>
        <Hash className="w-5 h-5 text-muted-foreground opacity-50" />
      </CardContent>
    </Card>
  );
}
