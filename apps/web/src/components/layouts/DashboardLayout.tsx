import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { Mic, LayoutDashboard, FileAudio, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dashboard/meetings', icon: FileAudio, label: 'Reuniones' },
    { path: '/dashboard/settings', icon: Settings, label: 'Configuración' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            <span className="font-bold">MeetAnalyzer</span>
          </Link>
        </div>

        <nav className="flex-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-8 w-8 rounded-full" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.organization?.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 text-sm"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
