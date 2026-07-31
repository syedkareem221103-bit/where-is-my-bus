import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { adminNavigation } from '@/constants/navigation';
import { cn } from '@/utils/utils';

export function AdminSidebar() {
  const { user } = useAuthStore();
  const location = useLocation();

  // Group the navigation items
  const groupedNav = adminNavigation.reduce((acc, item) => {
    // Check role permission
    if (item.roles && user && !item.roles.includes(user.role)) {
      return acc;
    }
    
    const group = item.group || 'Other';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof adminNavigation>);

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-background h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b">
        <Link to="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            WB
          </span>
          Admin Portal
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {Object.entries(groupedNav).map(([group, items]) => (
          <div key={group}>
            <h4 className="mb-2 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {group}
            </h4>
            <div className="space-y-1">
              {items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase text-muted-foreground">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground capitalize truncate">{user?.role.replace('_', ' ').toLowerCase()}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
