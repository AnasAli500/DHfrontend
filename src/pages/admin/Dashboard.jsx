import { useEffect, useState } from 'react';
import { Users, GraduationCap, BookOpen, Calendar, ClipboardCheck, FileText } from 'lucide-react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { StudentGrowthChart, AttendanceChart, ExamPerformanceChart, ClassDistributionChart } from '../../components/charts/DashboardCharts';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [examPerf, setExamPerf] = useState([]);
  const [classDist, setClassDist] = useState([]);
  const [loading, setLoading] = useState(true);

  const statCards = [
    { key: 'totalStudents', label: t('dashboard.totalStudents'), icon: GraduationCap, color: 'bg-blue-500' },
    { key: 'totalTeachers', label: t('dashboard.totalTeachers'), icon: BookOpen, color: 'bg-green-500' },
    { key: 'totalClasses', label: t('dashboard.totalClasses'), icon: Calendar, color: 'bg-purple-500' },
    { key: 'totalPeriods', label: t('dashboard.totalPeriods'), icon: Users, color: 'bg-orange-500' },
    { key: 'totalAttendance', label: t('dashboard.attendanceRecords'), icon: ClipboardCheck, color: 'bg-teal-500' },
    { key: 'totalExams', label: t('dashboard.totalExams'), icon: FileText, color: 'bg-pink-500' },
  ];

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/student-growth'),
      api.get('/dashboard/attendance-analytics'),
      api.get('/dashboard/exam-performance'),
      api.get('/dashboard/class-distribution'),
    ]).then(([s, g, a, e, c]) => {
      setStats(s.data);
      setGrowth(g.data);
      setAttendance(a.data);
      setExamPerf(e.data);
      setClassDist(c.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="stat-card">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-2xl font-bold">{stats?.[key] || 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.studentGrowth')}</h3>
          <StudentGrowthChart data={growth.length ? growth : [{ _id: 'N/A', count: 0 }]} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.attendanceAnalytics')}</h3>
          <AttendanceChart data={attendance.length ? attendance : [{ _id: t('common.noDataFound'), count: 0 }]} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.examPerformance')}</h3>
          <ExamPerformanceChart data={examPerf.length ? examPerf : [{ _id: 'N/A', count: 0 }]} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.classDistribution')}</h3>
          <ClassDistributionChart data={classDist.length ? classDist : [{ className: 'N/A', count: 0 }]} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
