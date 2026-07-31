import { Link, useLocation } from 'react-router-dom';
import { parentNavigation } from '@/constants/parentNavigation';
import { cn } from '@/utils/utils';

export function ParentBottomNav() {
  const location = useLocation();

  // Core actions to show in the bottom bar on mobile
  const bottomNavItems = parentNavigation.filter(item => 
    ['Dashboard', 'Trip', 'Notifications', 'Profile'].includes(item.title)
  );

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-background border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-6 w-6 mb-0.5", isActive && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
