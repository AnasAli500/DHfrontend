import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  ClipboardCheck, FileText, BarChart3, Settings, UserCircle,
  ChevronLeft, ChevronRight, ArrowUpCircle, DollarSign, Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const adminLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: t('navigation.dashboard') },
    { to: '/admin/users', icon: Users, label: t('navigation.users') },
    { to: '/admin/students', icon: GraduationCap, label: t('navigation.students') },
    { to: '/admin/teachers', icon: BookOpen, label: t('navigation.teachers') },
    { to: '/admin/classes', icon: Calendar, label: t('navigation.classes') },
    { to: '/admin/periods', icon: Calendar, label: t('navigation.periods') },
    { to: '/admin/attendance', icon: ClipboardCheck, label: t('navigation.attendance') },
    { to: '/admin/exams', icon: FileText, label: t('navigation.exams') },
    { to: '/exam-results', icon: Award, label: t('navigation.viewExamResults') },
    { to: '/admin/promotion', icon: ArrowUpCircle, label: t('navigation.promotion') },
    { to: '/admin/finance', icon: DollarSign, label: t('navigation.finance') },
    { to: '/admin/reports', icon: BarChart3, label: t('navigation.reports') },
    { to: '/admin/settings', icon: Settings, label: t('navigation.settings') },
    { to: '/profile', icon: UserCircle, label: t('navigation.profile') },
  ];

  const teacherLinks = [
    { to: '/teacher/dashboard', icon: LayoutDashboard, label: t('navigation.dashboard') },
    { to: '/teacher/attendance', icon: ClipboardCheck, label: t('navigation.attendance') },
    { to: '/teacher/exams', icon: FileText, label: t('navigation.exams') },
    { to: '/exam-results', icon: Award, label: t('navigation.viewExamResults') },
    { to: '/profile', icon: UserCircle, label: t('navigation.profile') },
  ];

  const studentLinks = [
    { to: '/student/dashboard', icon: LayoutDashboard, label: t('navigation.dashboard') },
    { to: '/student/attendance', icon: ClipboardCheck, label: t('navigation.attendance') },
    { to: '/student/exams', icon: FileText, label: t('navigation.viewExamResults') },
    { to: '/profile', icon: UserCircle, label: t('navigation.profile') },
  ];

  const links = user?.role === 'admin' ? adminLinks
    : user?.role === 'teacher' ? teacherLinks
    : studentLinks;

  const isRTL = document.documentElement.dir === 'rtl';

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between h-16 px-3 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          {settings?.schoolLogo ? (
            <img
              src={settings.schoolLogo}
              alt="School Logo"
              className="w-9 h-9 object-contain rounded-lg shrink-0 bg-gray-50 dark:bg-gray-700 p-0.5"
            />
          ) : (
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
          )}
          {!collapsed && (
            <span className="font-bold text-gray-900 dark:text-white truncate text-sm">
              {settings?.schoolName || 'SMS'}
            </span>
          )}
        </div>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 chevron-toggle shrink-0">
          {collapsed
            ? (isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
            : (isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)}
        </button>
      </div>

      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
