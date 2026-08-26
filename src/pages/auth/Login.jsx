import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const Login = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('auth.emailPasswordRequired'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('auth.passwordMinLength'));
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(t('auth.loginSuccess'));
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4 relative">
      {/* Top right language switcher */}
      <div className="absolute top-4 right-4 z-10 bg-white/10 backdrop-blur-md rounded-xl p-1">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl p-3 mb-4 border border-white/20">
            {settings?.schoolLogo ? (
              <img src={settings.schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
            ) : (
              <GraduationCap className="w-10 h-10 text-primary-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {settings?.schoolName || t('auth.schoolManagementSystem')}
          </h1>
          <p className="text-primary-200 mt-2 text-sm">{t('auth.signInToAccount')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('auth.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder={t('auth.enterEmail')} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('auth.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder={t('auth.enterPassword')}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">{t('auth.forgotPassword')}</Link>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
