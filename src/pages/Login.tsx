import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import BrandLogo from '../components/BrandLogo';

const homeForRole = (role: UserRole) => {
  if (role === 'developer') return '/dashboard/developer';
  if (role === 'support') return '/dashboard/support';
  return '/dashboard';
};

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser) {
        navigate(homeForRole(loggedInUser.role), { replace: true });
      } else {
        setError('بيانات الدخول غير صحيحة');
      }
    } catch (err) {
      setError(`حدث خطأ أثناء تسجيل الدخول: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-violet-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-linear-to-br from-cyan-400 via-blue-600 to-violet-600 p-3.5 shadow-xl shadow-violet-200">
            <BrandLogo variant="mark" imageClassName="h-full w-full brightness-0 invert" />
          </div>
          <BrandLogo variant="dark" className="mb-3" imageClassName="h-12" />
          <h1 className="text-xl font-black text-slate-950">تسجيل الدخول</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">ادخل إلى لوحة إدارة mel.iq</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-right">
            <span className="mb-2 block text-sm font-bold text-slate-700">البريد الإلكتروني</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@mel.com"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </label>

          <label className="block text-right">
            <span className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
