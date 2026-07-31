import { Card, CardContent } from '@/components/ui/card';
import { Phone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmergencyContactCardProps {
  title: string;
  phoneNumber: string;
  description: string;
}

export function EmergencyContactCard({ title, phoneNumber, description }: EmergencyContactCardProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-bold text-destructive">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" className="h-9 gap-2 shrink-0" title={phoneNumber}>
          <Phone className="w-4 h-4" />
          <span className="sr-only sm:not-sr-only sm:text-xs">Call</span>
        </Button>
      </CardContent>
    </Card>
  );
}
