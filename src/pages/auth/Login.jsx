import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, ShieldCheck, Sparkles, BookOpen, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { isNetworkError, wakeServer } from '../../utils/serverWake';

const Login = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wakingServer, setWakingServer] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    wakeServer().finally(() => {
      if (active) setWakingServer(false);
    });

    return () => {
      active = false;
    };
  }, []);

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
      if (isNetworkError(err)) {
        toast.error(t('auth.serverTimeout'));
      } else {
        toast.error(err.response?.data?.message || t('auth.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const schoolDisplayName = settings?.schoolName || t('auth.schoolManagementSystem') || 'DhambaalSchool';

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 p-4 sm:p-6 md:p-8 overflow-hidden font-sans">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/30 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Floating Glass Language Switcher */}
      <div className="absolute top-5 right-5 z-20 bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl transition-all duration-300 hover:border-primary-500/30">
        <LanguageSwitcher />
      </div>

      {/* Main Glass Card Container */}
      <div className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10">
        
        {/* Left Branding Hero Section */}
        <div className="md:col-span-5 bg-gradient-to-br from-primary-950/80 via-slate-900 to-indigo-950/90 p-8 lg:p-10 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-slate-800/80 overflow-hidden">
          {/* Ambient inner glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            {/* Logo Badge */}
            <div className="inline-flex items-center gap-3 bg-slate-950/60 border border-white/10 p-2.5 pr-4 rounded-2xl backdrop-blur-md shadow-lg mb-8">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center shadow-md shadow-primary-600/30">
                {settings?.schoolLogo ? (
                  <img src={settings.schoolLogo} alt="School Logo" className="w-7 h-7 object-contain rounded-lg" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-white" />
                )}
              </div>
              <span className="text-lg font-bold text-white tracking-wide">
                Dhambaal<span className="text-primary-400">School</span>
              </span>
            </div>

            {/* Main Welcome Message */}
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Welcome to <br />
              <span className="bg-gradient-to-r from-primary-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                {schoolDisplayName}
              </span>
            </h1>
            {/* <p className="mt-4 text-slate-400 text-sm leading-relaxed">
              Empowering education through seamless digital management. Access grades, attendance, exam records, and institution insights in one place.
            </p> */}

            {/* Feature Highlights */}
            <div className="mt-8 space-y-3.5 hidden sm:block">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-300 bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span>Academic & Student Management</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-300 bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>Real-Time Attendance & Performance</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-300 bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Secure & Role-Based Access</span>
              </div>
            </div>
          </div>

          {/* Footer note in hero */}
          <div className="mt-8 pt-6 border-t border-slate-800/60 relative z-10 flex items-center justify-between text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} DhambaalSchool</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              System Active
            </span>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="md:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-slate-900/60">
          <div className="max-w-md mx-auto w-full">
            
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {t('auth.signIn')}
              </h2>
              <p className="text-slate-400 text-sm mt-1.5">
                {t('auth.signInToAccount')}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200"
                    placeholder={t('auth.enterEmail')}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200"
                    placeholder={t('auth.enterPassword')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              {/* Waking Server Status Notice */}
              {wakingServer && (
                <div className="flex items-center justify-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>{t('auth.serverWaking')}</span>
                </div>
              )}

              {/* Action Buttons: Login & View Result */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="submit"
                  disabled={loading || wakingServer}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary-600/30 hover:shadow-primary-600/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('auth.signingIn')}</span>
                    </>
                  ) : wakingServer ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('auth.serverWaking')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('auth.signIn')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <Link
                  to="/result-search"
                  className="w-full py-3.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-slate-700/30 transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-[0.99]"
                >
                  <Search className="w-4 h-4 text-primary-400" />
                  <span>View Result</span>
                </Link>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;

