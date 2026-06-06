import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Bus, 
  LayoutDashboard, 
  MapPinned, 
  Users, 
  LogOut, 
  Bell,
  Settings,
  CircleUser
} from 'lucide-react';

export default function Layout({ children, activePage, setActivePage }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['INST_ADMIN', 'SUPER_ADMIN'] },
    { id: 'driver', label: 'Driver Panel', icon: Bus, roles: ['DRIVER'] },
    { id: 'parent', label: 'Parent Portal', icon: CircleUser, roles: ['PARENT'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex text-slate-100 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="w-68 border-r border-slate-800/40 bg-slate-950/70 backdrop-blur-md flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand */}
          <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800/40">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-wide bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Where Is My Bus
              </h1>
              <span className="text-[10px] text-slate-400 font-medium">TRANSPORT IQ</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/45 to-purple-900/30 border border-cyan-500/30 text-cyan-400 font-semibold shadow-md shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-800/40 bg-slate-950/30">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName}`}
              alt="avatar"
              className="w-10 h-10 rounded-xl border border-slate-700 object-cover"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-400 capitalize font-medium">{user?.role.replace('_', ' ').toLowerCase()}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/20 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-rose-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-20 border-b border-slate-800/40 bg-slate-950/20 backdrop-blur-sm flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-100 capitalize">
              {activePage.replace('_', ' ')}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {user?.institution?.name || 'Smart Transport Console'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/15 text-[11px] text-emerald-400 font-medium select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Node Connected
            </div>

            <button className="p-2.5 rounded-xl border border-slate-800/60 bg-slate-900/30 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400"></span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
