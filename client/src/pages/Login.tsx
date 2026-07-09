import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, fetchAPI } from '../App.tsx';
import { KeyRound, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetchAPI('/auth/login', 'POST', { email, password });
      if (res.success) {
        login(res.user, res.accessToken, res.refreshToken);
        navigate('/');
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Server error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-brand-900 px-4">
      <div className="w-full max-w-md p-8 rounded-3xl glass-panel bg-white/10 border-white/10 shadow-premium-dark flex flex-col gap-6 relative overflow-hidden backdrop-blur-2xl">
        {/* Background Gradients */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-28 h-28 rounded-3xl bg-white flex items-center justify-center shadow-lg shadow-emerald-500/10 overflow-hidden border border-slate-200/20">
            <img src="/logo.png" alt="" className="w-full h-full object-contain" onError={(e) => {
              e.currentTarget.style.display = 'none';
              const sLetter = e.currentTarget.nextSibling as HTMLElement;
              if (sLetter) sLetter.style.display = 'block';
            }} />
            <span className="text-3xl font-black text-emerald-500" style={{ display: 'none' }}>S</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-2">Seyon Microfinance</h2>
          <p className="text-slate-400 text-xs tracking-wide uppercase">Enterprise Cash Register</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@seyon.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-slate-900/50 text-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300 ml-1">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-slate-900/50 text-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="flex flex-col gap-1 items-center justify-center text-[10px] text-slate-500 border-t border-white/5 pt-4">
          <span>Demo Credentials: admin@seyon.com / admin123</span>
          <span>Security Enforced • TLS Session Layer</span>
        </div>
      </div>
    </div>
  );
}
