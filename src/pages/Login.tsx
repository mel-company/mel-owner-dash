import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLE_ACCOUNTS: Record<string, { email: string; password: string }> = {
  owner: {
    email: 'mohammed@mel.com',
    password: '1234',
  },
  employee: {
    email: 'ahmed@mel.com',
    password: '1234',
  },
  support: {
    email: 'mustafa@mel.com',
    password: '1234',
  },
  developer: {
    email: 'hassan21@mel.com',
    password: '1234',
  },
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleLogin = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const role = e.target.value;
    if (!role) return;

    setLoading(true);
    setError('');

    try {
      const account = ROLE_ACCOUNTS[role];
      const success = await login(account.email, account.password);

      if (success) {
        navigate('/dashboard');
      } else {
        setError('فشل تسجيل الدخول');
      }
    } catch (err) {
      setError(`حدث خطأ أثناء تسجيل الدخول: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">mel.iq</h1>
          <p className="text-gray-600">اختر الدور لتسجيل الدخول</p>
        </div>

        {/* Role Select */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            تسجيل الدخول كـ
          </label>

          <select
            onChange={handleRoleLogin}
            disabled={loading}
            defaultValue=""
            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
          >
            <option value="" disabled>
              اختر الدور
            </option>
            <option value="owner">مالك المتجر</option>
            <option value="employee">موظف</option>
            <option value="support">الدعم</option>
            <option value="developer">مطور النظام</option>
          </select>
        </div>

        {loading && (
          <p className="text-center text-sm text-indigo-600 mt-4">
            جاري تسجيل الدخول...
          </p>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="mt-8 pt-6 border-t text-center text-xs text-gray-500">
          تسجيل دخول سريع مخصص للاختبار
        </div>
      </div>
    </div>
  );
};

export default Login;
