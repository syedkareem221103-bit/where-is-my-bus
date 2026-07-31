import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { adminNavigation } from '@/constants/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, Settings, Bell } from 'lucide-react';
import { cn } from '@/utils/utils';

export function AdminTopbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Basic breadcrumb logic
  const pathnames = location.pathname.split('/').filter((x) => x);
  const breadcrumbItems = pathnames.map((value, index) => {
    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
    const label = value.charAt(0).toUpperCase() + value.slice(1);
    return { to, label };
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
      {/* Mobile Sidebar Toggle */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <div className="h-16 flex items-center px-6 border-b">
            <Link to="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
              <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                WB
              </span>
              Admin Portal
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {adminNavigation.map((item) => {
              if (item.roles && user && !item.roles.includes(user.role)) {
                return null;
              }
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
        </SheetContent>
      </Sheet>

      {/* Breadcrumbs Placeholder */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground flex-1">
        {breadcrumbItems.map((item, index) => (
          <div key={item.to} className="flex items-center gap-2">
            {index > 0 && <span>/</span>}
            <Link 
              to={item.to}
              className={cn(
                "hover:text-foreground transition-colors",
                index === breadcrumbItems.length - 1 ? "font-medium text-foreground" : ""
              )}
            >
              {item.label}
            </Link>
          </div>
        ))}
      </div>
      
      {/* Spacer for mobile */}
      <div className="flex-1 sm:hidden"></div>

      {/* Topbar Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications (Placeholder) */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 ml-2 bg-muted hover:bg-muted/80">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary uppercase">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/admin/settings" className="flex items-center w-full">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
