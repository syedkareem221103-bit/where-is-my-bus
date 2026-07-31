import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { getDefaultRouteForRole } from '@/router/redirectConfig';

export function ForbiddenPage() {
  const { user } = useAuthStore();
  const defaultRoute = getDefaultRouteForRole(user?.role);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive" />
      <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
      <p className="text-muted-foreground max-w-[500px]">
        You don't have permission to access this page. If you believe this is a mistake, please contact your administrator.
      </p>
      <div className="flex gap-4 mt-4">
        <Button asChild variant="outline">
          <Link to="/login">Switch Account</Link>
        </Button>
        <Button asChild>
          <Link to={defaultRoute}>Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
