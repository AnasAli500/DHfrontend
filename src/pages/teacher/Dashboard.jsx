import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, ClipboardCheck, FileText } from 'lucide-react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/teacher').then(({ data: d }) => setData(d)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const stats = [
    { label: 'Assigned Periods', value: data?.periods?.length || 0, icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Total Students', value: data?.totalStudents || 0, icon: GraduationCap, color: 'bg-blue-500' },
    { label: 'Attendance Records', value: data?.totalAttendance || 0, icon: ClipboardCheck, color: 'bg-green-500' },
    { label: 'Exams Recorded', value: data?.totalExams || 0, icon: FileText, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Teacher Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">My Assigned Periods</h3>
        {data?.periods?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.periods.map((p) => (
              <div key={p._id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="font-medium">{p.periodName}</p>
                <p className="text-sm text-gray-500">{p.subject} - {p.classId?.className}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No periods assigned yet.</p>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
