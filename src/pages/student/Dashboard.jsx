import { useEffect, useState } from 'react';
import { GraduationCap, ClipboardCheck, FileText } from 'lucide-react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/student').then(({ data: d }) => setData(d)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Student Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Class</p>
            <p className="text-lg font-bold">{data?.student?.classId?.className || 'Not Assigned'}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Attendance Rate</p>
            <p className="text-2xl font-bold">{data?.attendanceRate || 0}%</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Exam Results</p>
            <p className="text-2xl font-bold">{data?.exams?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Attendance</h3>
          {data?.attendance?.length ? data.attendance.map((a) => (
            <div key={a._id} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
              <span>{a.periodId?.subject}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'Present' ? 'bg-green-100 text-green-700' : a.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status}</span>
            </div>
          )) : <p className="text-gray-500">No attendance records</p>}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Exam Results</h3>
          {data?.exams?.length ? data.exams.map((e) => (
            <div key={e._id} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
              <span>{e.periodId?.subject}</span>
              <span className="font-medium">{e.marks} ({e.grade})</span>
            </div>
          )) : <p className="text-gray-500">No exam results</p>}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
