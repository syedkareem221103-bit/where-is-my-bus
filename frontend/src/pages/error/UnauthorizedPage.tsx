import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <AlertTriangle className="h-16 w-16 text-destructive" />
      <h1 className="text-3xl font-bold tracking-tight">Session Expired</h1>
      <p className="text-muted-foreground max-w-[500px]">
        Your session has expired or you are not logged in. Please sign in to continue.
      </p>
      <Button asChild className="mt-4">
        <Link to="/login">Return to Login</Link>
      </Button>
    </div>
  );
}
