import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface StudentCounterProps {
  current: number;
  total: number;
  label?: string;
}

export function StudentCounter({ current, total, label = "Students Boarded" }: StudentCounterProps) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
        <Users className="w-8 h-8 text-primary mb-2" />
        <div className="text-4xl font-bold tracking-tighter text-foreground">
          {current} <span className="text-2xl text-muted-foreground">/ {total}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}
