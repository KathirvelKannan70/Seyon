import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LayoutDashboard, MapPin, Users, Landmark, Banknote, FileSpreadsheet,
  CalendarDays, ShieldCheck, DollarSign, LogOut, Sun, Moon, Menu, X
} from 'lucide-react';

// Pages - We will write these in separate files
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Areas from './pages/Areas.tsx';
import Kulus from './pages/Kulus.tsx';
import Members from './pages/Members.tsx';
import Loans from './pages/Loans.tsx';
import Collections from './pages/Collections.tsx';
import Reports from './pages/Reports.tsx';
import CalendarPage from './pages/Calendar.tsx';
import Staff from './pages/Staff.tsx';
import Expenses from './pages/Expenses.tsx';

// ==========================================
// API Helper Utilities
// ==========================================
export const SERVER_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, '')
  : 'http://localhost:5000';
export const API_URL = `${SERVER_URL}/api`;

export const fetchAPI = async (endpoint: string, method = 'GET', body: any = null, token: string | null = null): Promise<any> => {
  let activeToken = token || localStorage.getItem('access_token');

  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const config: any = {
    method,
    headers,
  };
  if (body) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_URL}${endpoint}`, config);
  let data = await response.json();

  // If unauthorized / token expired, try to refresh token silently
  if (response.status === 401 && localStorage.getItem('refresh_token')) {
    try {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: localStorage.getItem('refresh_token') }),
      });
      const refreshData = await refreshResponse.json();

      if (refreshResponse.ok && refreshData.success) {
        localStorage.setItem('access_token', refreshData.accessToken);
        localStorage.setItem('refresh_token', refreshData.refreshToken);

        // Retry the original request with the new token
        config.headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
        response = await fetch(`${API_URL}${endpoint}`, config);
        data = await response.json();
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    } catch (refreshError) {
      console.error('Silent token refresh failed:', refreshError);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};

// ==========================================
// Authentication Context
// ==========================================
interface AuthContextType {
  user: any | null;
  token: string | null;
  login: (userData: any, token: string, refreshToken: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

// ==========================================
// Theme Context
// ==========================================
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
};

// ==========================================
// Layout Wrapper Component (Dual Layout)
// ==========================================
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['super_admin', 'manager', 'officer', 'viewer'] },
    { name: 'Areas', path: '/areas', icon: MapPin, roles: ['super_admin', 'manager'] },
    { name: 'Kulus (Groups)', path: '/kulus', icon: Users, roles: ['super_admin', 'manager', 'officer'] },
    { name: 'Members Register', path: '/members', icon: ShieldCheck, roles: ['super_admin', 'manager', 'officer', 'viewer'] },
    { name: 'Loans & Schemes', path: '/loans', icon: Landmark, roles: ['super_admin', 'manager'] },
    { name: 'Collections Desk', path: '/collections', icon: Banknote, roles: ['super_admin', 'manager', 'officer'] },
    { name: 'Expenses Ledger', path: '/expenses', icon: DollarSign, roles: ['super_admin', 'manager'] },
    { name: 'Reports Desk', path: '/reports', icon: FileSpreadsheet, roles: ['super_admin', 'manager', 'viewer'] },
    { name: 'Calendar Schedule', path: '/calendar', icon: CalendarDays, roles: ['super_admin', 'manager', 'officer'] },
    { name: 'Staff Control', path: '/staff', icon: Users, roles: ['super_admin', 'manager'] },
  ];

  const allowedMenu = menuItems.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-lg font-extrabold bg-gradient-to-r from-cyan-600 to-brand-500 bg-clip-text text-transparent flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="w-11 h-11 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span>SEYON MICROFINANCE</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:scale-105 transition-all text-slate-600 dark:text-slate-300">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold">{user?.name}</span>
            <span className="text-[10px] text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-rose-500 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:scale-105 transition-all">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={`fixed inset-y-0 left-0 top-[57px] z-30 w-64 glass-panel border-r border-slate-200/50 dark:border-slate-800/50 transform transition-transform duration-300 md:translate-x-0 md:static md:h-[calc(100vh-57px)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <nav className="flex flex-col gap-1.5 p-4 overflow-y-auto h-full pb-20">
            {allowedMenu.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <Icon size={18} className="text-slate-500" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-[calc(100vh-57px)] pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-around py-2.5 px-2">
        <Link to="/" className="flex flex-col items-center text-slate-500 hover:text-brand-500">
          <LayoutDashboard size={20} />
          <span className="text-[10px] mt-1">Dashboard</span>
        </Link>
        {user?.role !== 'viewer' && (
          <Link to="/collections" className="flex flex-col items-center text-slate-500 hover:text-brand-500">
            <Banknote size={20} />
            <span className="text-[10px] mt-1">Collect</span>
          </Link>
        )}
        <Link to="/members" className="flex flex-col items-center text-slate-500 hover:text-brand-500">
          <ShieldCheck size={20} />
          <span className="text-[10px] mt-1">Members</span>
        </Link>
        <Link to="/calendar" className="flex flex-col items-center text-slate-500 hover:text-brand-500">
          <CalendarDays size={20} />
          <span className="text-[10px] mt-1">Schedule</span>
        </Link>
      </div>
    </div>
  );
};

// ==========================================
// Route Gate Guard
// ==========================================
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-950">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

// ==========================================
// App Root Component
// ==========================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    // Validate session
    const loadSession = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const res = await fetchAPI('/auth/me', 'GET', null, storedToken);
          if (res.success) {
            setUser(res.data);
          } else {
            localStorage.removeItem('access_token');
            setToken(null);
          }
        } catch (err) {
          localStorage.removeItem('access_token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    loadSession();
  }, []);

  // Theme Sync
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const login = (userData: any, accessToken: string, refreshToken: string) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, token, login, logout, loading }}>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/areas" element={<ProtectedRoute allowedRoles={['super_admin', 'manager']}><Areas /></ProtectedRoute>} />
              <Route path="/kulus" element={<ProtectedRoute allowedRoles={['super_admin', 'manager', 'officer']}><Kulus /></ProtectedRoute>} />
              <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
              <Route path="/loans" element={<ProtectedRoute allowedRoles={['super_admin', 'manager']}><Loans /></ProtectedRoute>} />
              <Route path="/collections" element={<ProtectedRoute allowedRoles={['super_admin', 'manager', 'officer']}><Collections /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute allowedRoles={['super_admin', 'manager']}><Expenses /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['super_admin', 'manager', 'viewer']}><Reports /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute allowedRoles={['super_admin', 'manager', 'officer']}><CalendarPage /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute allowedRoles={['super_admin', 'manager']}><Staff /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
