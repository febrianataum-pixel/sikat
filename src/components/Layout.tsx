import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  FileText, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Settings
} from 'lucide-react';
import { useState } from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useUserRole } from '../hooks/useUserRole';
import { UserCircle } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'petugas'] },
  { name: 'Data Petugas', href: '/petugas', icon: Users, roles: ['admin'] },
  { name: 'Log Kegiatan', href: '/kegiatan', icon: Calendar, roles: ['admin', 'petugas'] },
  { name: 'Arsip Laporan', href: '/laporan', icon: FileText, roles: ['admin'] },
  { name: 'Utilitas & Pengaturan', href: '/utilitas', icon: Settings, roles: ['admin'] },
  { name: 'Profil Saya', href: '/profile', icon: UserCircle, roles: ['admin', 'petugas'] },
];

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, userProfile, loading } = useUserRole(auth.currentUser);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const filteredNav = navigation.filter(item => item.roles.includes(role || ''));

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">S</div>
            <span className="text-xl font-bold tracking-tight text-indigo-900">SIKAT</span>
          </div>

          <nav className="flex-1 px-4 space-y-1 mt-4">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors",
                    isActive 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-white overflow-hidden flex items-center justify-center text-indigo-700 text-xs font-bold">
                {auth.currentUser?.email?.[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{userProfile?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{role === 'admin' ? 'Administrator' : 'Petugas Lapangan'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <LogOut size={18} />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 lg:hidden"
          >
            <Menu size={24} />
          </button>

          <div className="flex-1 hidden sm:block">
            <h1 className="text-lg font-bold text-slate-800">
              {filteredNav.find(n => n.href === location.pathname)?.name || 'Halaman'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
            </button>
            <div className="hidden sm:block text-right">
               <p className="text-xs font-medium text-slate-500">{auth.currentUser?.email}</p>
            </div>
          </div>
        </header>

        {/* Page Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
