import { useEffect, useState } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';

const STATUS_STYLES = {
  Present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Late: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const StudentAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/attendance', { params: { page, limit: 10 } })
      .then(({ data }) => { setAttendance(data.attendance); setPages(data.pages); })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Attendance</h1>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Class</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Teacher</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.length === 0 ? (
              <tr><td colSpan={4} className="py-12 text-center text-gray-500">No attendance records found.</td></tr>
            ) : attendance.map((a) => (
              <tr key={a._id} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-3 px-4">{a.classId?.className}</td>
                <td className="py-3 px-4">{a.teacherId?.name || '-'}</td>
                <td className="py-3 px-4">{new Date(a.date).toLocaleDateString()}</td>
                <td className="py-3 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4">
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
