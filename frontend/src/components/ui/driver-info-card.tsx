import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DriverInfoCardProps {
  name: string;
  phonePlaceholder: string;
}

export function DriverInfoCard({ name, phonePlaceholder }: DriverInfoCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-secondary text-secondary-foreground"><User className="w-5 h-5" /></AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">Driver</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-2" title={phonePlaceholder}>
          <Phone className="w-3 h-3" />
          <span className="sr-only sm:not-sr-only sm:text-xs">Call</span>
        </Button>
      </CardContent>
    </Card>
  );
}
