import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GraduationCap, MapPin } from 'lucide-react';

interface ChildInfoCardProps {
  name: string;
  grade: string;
  assignedRoute: string;
}

export function ChildInfoCard({ name, grade, assignedRoute }: ChildInfoCardProps) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary/10">
          <AvatarFallback className="text-xl font-bold bg-primary/5 text-primary">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">{name}</h3>
          <div className="flex items-center text-sm text-muted-foreground">
            <GraduationCap className="w-4 h-4 mr-1.5" />
            {grade}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-1.5" />
            {assignedRoute}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
