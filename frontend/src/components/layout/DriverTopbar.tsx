import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { driverNavigation } from '@/constants/driverNavigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, Settings, Bell, Car } from 'lucide-react';
import { cn } from '@/utils/utils';

export function DriverTopbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Breadcrumb basic
  const pathnames = location.pathname.split('/').filter((x) => x);
  const breadcrumbItems = pathnames.map((value, index) => {
    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
    const label = value.charAt(0).toUpperCase() + value.slice(1);
    return { to, label };
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger Menu (for secondary items) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
            <SheetTitle className="sr-only">Driver Menu</SheetTitle>
            <div className="h-16 flex items-center px-6 border-b">
              <Link to="/driver" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
                <Car className="h-6 w-6" />
                Driver Portal
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
              {driverNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex flex-col hidden sm:flex">
          <span className="text-sm font-semibold text-foreground">Driver Portal</span>
          {breadcrumbItems.length > 1 && (
            <span className="text-xs text-muted-foreground">{breadcrumbItems[breadcrumbItems.length - 1].label}</span>
          )}
        </div>
      </div>

      {/* Topbar Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications (Placeholder) */}
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 ml-2 bg-muted hover:bg-muted/80">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary uppercase">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-base font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer p-3">
              <Link to="/driver/settings" className="flex items-center w-full">
                <Settings className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer p-3 text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-3 h-5 w-5" />
              <span className="text-sm font-medium">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
