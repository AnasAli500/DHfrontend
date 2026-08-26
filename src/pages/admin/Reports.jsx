import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Reports = () => {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { key: 'students', label: t('reports.studentReport'), endpoint: '/reports/students' },
    { key: 'teachers', label: t('reports.teacherReport'), endpoint: '/reports/teachers' },
    { key: 'attendance', label: t('reports.attendanceReport'), endpoint: '/reports/attendance' },
    { key: 'exams', label: t('reports.examReport'), endpoint: '/reports/exams' },
    { key: 'classes', label: t('reports.classReport'), endpoint: '/reports/classes' },
  ];

  const generateReport = async (report) => {
    setLoading(true);
    setActiveReport(report);
    try {
      const { data: result } = await api.get(report.endpoint);
      setData(result.data);
      toast.success(`${report.label} ${t('reports.reportGenerated')}`);
    } catch {
      toast.error(t('reports.failedToGenerate'));
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data.length) return;
    const keys = Object.keys(data[0]).filter((k) => k !== '__v' && typeof data[0][k] !== 'object');
    const csv = [keys.join(',')].concat(
      data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport.key}-report.csv`;
    a.click();
    toast.success(t('reports.reportExported'));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('reports.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((r) => (
          <button key={r.key} onClick={() => generateReport(r)} className="card hover:shadow-md transition-shadow text-left flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold">{r.label}</p>
              <p className="text-sm text-gray-500">{t('reports.clickToGenerate')}</p>
            </div>
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner />}

      {activeReport && data.length > 0 && !loading && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{activeReport.label} ({data.length} {t('common.records')})</h3>
            <button onClick={exportCSV} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" /> {t('reports.exportCSV')}
            </button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {Object.keys(data[0]).filter((k) => !['_id', '__v'].includes(k) && typeof data[0][k] !== 'object').slice(0, 6).map((k) => (
                    <th key={k} className="text-left py-2 px-3 capitalize">{k.replace(/([A-Z])/g, ' $1')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                    {Object.keys(data[0]).filter((k) => !['_id', '__v'].includes(k) && typeof data[0][k] !== 'object').slice(0, 6).map((k) => (
                      <td key={k} className="py-2 px-3">{String(row[k] ?? '-')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
