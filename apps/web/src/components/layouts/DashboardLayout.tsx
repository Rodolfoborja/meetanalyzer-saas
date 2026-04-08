import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/auth';
import {
  Mic,
  LayoutDashboard,
  FileAudio,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/dashboard/meetings', icon: FileAudio, label: 'Reuniones' },
  { path: '/dashboard/settings', icon: Settings, label: 'Configuración' },
];

export default function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b h-16 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 ml-3">
          <Mic className="h-6 w-6 text-primary" />
          <span className="font-bold">MeetAnalyzer</span>
        </Link>
      </header>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-white border-r flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <Mic className="h-6 w-6 text-primary" />
                  <span className="font-bold">MeetAnalyzer</span>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent
                user={user}
                logout={logout}
                isActive={isActive}
                onNavigate={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r flex-col z-30">
        <div className="p-4 border-b">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            <span className="font-bold">MeetAnalyzer</span>
          </Link>
        </div>
        <SidebarContent user={user} logout={logout} isActive={isActive} />
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

interface SidebarContentProps {
  user: any;
  logout: () => void;
  isActive: (path: string, exact?: boolean) => boolean;
  onNavigate?: () => void;
}

function SidebarContent({ user, logout, isActive, onNavigate }: SidebarContentProps) {
  return (
    <>
      {/* Quick action */}
      <div className="p-4">
        <Link to="/dashboard/meetings/new" onClick={onNavigate}>
          <Button className="w-full justify-center">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Reunión
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        {navItems.map((item) => {
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors relative group',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('h-5 w-5', active && 'text-primary')} />
              {item.label}
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Usage info */}
      <div className="px-4 py-3 mx-3 mb-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Minutos usados</span>
          <span className="font-medium">0/60</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full w-0" />
        </div>
        <Link
          to="/dashboard/settings"
          onClick={onNavigate}
          className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
        >
          Upgrade plan <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* User section */}
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center gap-3 mb-3">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {user?.name?.[0] || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.organization?.name}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 text-sm w-full px-2 py-1.5 rounded hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
