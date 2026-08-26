import { Menu, Sun, Moon, Monitor, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';

const Header = ({ onMenuClick, sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'system'];
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeLabel = theme === 'dark' ? t('theme.dark') : theme === 'light' ? t('theme.light') : t('theme.system');

  return (
    <header className={`fixed top-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30 flex items-center justify-between px-4 transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-64'}`}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden" aria-label="Toggle menu">
          <Menu className="w-5 h-5" />
        </button>

        {settings?.schoolLogo && (
          <div className="hidden md:flex items-center gap-2">
            <img src={settings.schoolLogo} alt="Logo" className="w-7 h-7 object-contain rounded" />
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 hidden lg:inline">
              {settings?.schoolName}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <LanguageSwitcher />

        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title={`${t('theme.light')}/${t('theme.dark')}: ${themeLabel}`}
          id="theme-toggle-btn"
        >
          <ThemeIcon className="w-5 h-5" />
        </button>

        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative"
          aria-label="Notifications"
          id="notifications-btn"
        >
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 ps-3 border-s border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
            title="Logout"
            id="logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
