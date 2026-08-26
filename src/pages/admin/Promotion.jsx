import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckSquare, Square, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const PROMOTION_STATUSES = ['Promoted', 'Not Promoted', 'Graduated', 'Transferred', 'Repeating', 'Pending'];

const Promotion = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialFromClassId = searchParams.get('fromClassId') || '';

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Move to Next Class state
  const [fromClassId, setFromClassId] = useState(initialFromClassId);
  const [toClassId, setToClassId] = useState('');
  const [targetAcademicYear, setTargetAcademicYear] = useState('2026');
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState({});
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [moving, setMoving] = useState(false);

  // Complete Year state
  const [academicYearToComplete, setAcademicYearToComplete] = useState('2025-2026');

  useEffect(() => {
    api.get('/classes', { params: { limit: 100 } })
      .then(({ data }) => setClasses(data.classes))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!fromClassId) {
      setStudents([]);
      setSelectedStudentIds([]);
      setStudentStatuses({});
      return;
    }

    setFetchingStudents(true);
    api.get(`/promotion/students-for-move?classId=${fromClassId}`)
      .then(({ data }) => {
        setStudents(data.students);
        const allIds = data.students.map((s) => s._id);
        setSelectedStudentIds(allIds);

        const statusObj = {};
        data.students.forEach((s) => {
          statusObj[s._id] = s.promotionStatus && s.promotionStatus !== 'Pending' ? s.promotionStatus : 'Promoted';
        });
        setStudentStatuses(statusObj);

        const fromCls = data.class;
        if (fromCls) {
          const nextGradeMap = {
            'Grade 1': 'Grade 2', 'Grade 2': 'Grade 3', 'Grade 3': 'Grade 4',
            'Grade 4': 'Grade 5', 'Grade 5': 'Grade 6', 'Grade 6': 'Grade 7',
            'Grade 7': 'Grade 8', 'Grade 8': 'Grade 9', 'Grade 9': 'Grade 10',
            'Grade 10': 'Grade 11', 'Grade 11': 'Grade 12',
          };
          const nextGrade = nextGradeMap[fromCls.gradeLevel];
          if (nextGrade) {
            const candidate = classes.find((c) => c.gradeLevel === nextGrade && c._id !== fromClassId);
            if (candidate) setToClassId(candidate._id);
          }
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load students for class');
      })
      .finally(() => setFetchingStudents(false));
  }, [fromClassId, classes]);

  const handleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s._id));
    }
  };

  const handleToggleStudent = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sId) => sId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setStudentStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleApplyBatchStatus = (status) => {
    const updated = { ...studentStatuses };
    selectedStudentIds.forEach((id) => {
      updated[id] = status;
    });
    setStudentStatuses(updated);
    toast.success(`Applied "${status}" to ${selectedStudentIds.length} selected student(s)`);
  };

  const handleMoveSelectedStudents = async () => {
    if (!fromClassId) return toast.error('Please select From Class');
    if (!toClassId) return toast.error('Please select To Class');
    if (fromClassId === toClassId) return toast.error('From Class and To Class cannot be the same');
    if (selectedStudentIds.length === 0) return toast.error('Please select at least one student to move');

    const payloadStudents = selectedStudentIds.map((id) => ({
      studentId: id,
      promotionStatus: studentStatuses[id] || 'Promoted',
    }));

    setMoving(true);
    try {
      const { data } = await api.post('/promotion/move-selected', {
        fromClassId,
        toClassId,
        academicYear: targetAcademicYear,
        students: payloadStudents,
      });

      toast.success(data.message);

      const refreshRes = await api.get(`/promotion/students-for-move?classId=${fromClassId}`);
      setStudents(refreshRes.data.students);
      setSelectedStudentIds(refreshRes.data.students.map((s) => s._id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move students');
    } finally {
      setMoving(false);
    }
  };

  const handleCompleteYear = async () => {
    if (!confirm(`Are you sure you want to complete academic year ${academicYearToComplete}? All active classes and enrollments for this year will be marked Completed.`)) return;
    try {
      const { data } = await api.post('/promotion/complete-year', { academicYear: academicYearToComplete });
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete academic year');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('promotion.title')}</h1>
        <p className="text-sm text-gray-500">
          Move students from one class to another. Old class enrollments, exams, results, and attendance remain permanently intact.
        </p>
      </div>

      <div className="card space-y-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
          <ArrowRight className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('promotion.moveToNextClass')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('promotion.fromClass')}:</label>
            <select className="input-field" value={fromClassId} onChange={(e) => setFromClassId(e.target.value)}>
              <option value="">-- {t('classes.selectClass')} --</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.className} - {c.gradeLevel} ({c.academicYear}) [{c.status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('promotion.toClass')}:</label>
            <select className="input-field" value={toClassId} onChange={(e) => setToClassId(e.target.value)}>
              <option value="">-- {t('classes.selectClass')} --</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.className} - {c.gradeLevel} ({c.academicYear}) [{c.status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('promotion.targetAcademicYear')}:</label>
            <input
              className="input-field"
              value={targetAcademicYear}
              onChange={(e) => setTargetAcademicYear(e.target.value)}
              placeholder="e.g. 2026"
            />
          </div>
        </div>

        {fromClassId && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-200 dark:border-blue-800/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                >
                  {selectedStudentIds.length === students.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {t('promotion.selectAll')} ({students.length})
                </button>
                <span className="text-xs text-gray-500">
                  {selectedStudentIds.length} / {students.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t('promotion.promotionStatus')}:</span>
                {PROMOTION_STATUSES.filter((st) => st !== 'Pending').map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleApplyBatchStatus(st)}
                    className="px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {fetchingStudents ? (
              <LoadingSpinner />
            ) : (
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-xs">
                    <tr>
                      <th className="py-2.5 px-4 w-10">{t('common.select')}</th>
                      <th className="py-2.5 px-4">{t('students.studentId')}</th>
                      <th className="py-2.5 px-4">{t('students.fullName')}</th>
                      <th className="py-2.5 px-4">{t('common.gender')}</th>
                      <th className="py-2.5 px-4">{t('promotion.promotionStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {students.map((s) => {
                      const isSelected = selectedStudentIds.includes(s._id);
                      return (
                        <tr
                          key={s._id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStudent(s._id)}
                              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-primary-600">{s.studentId}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{s.name}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{s.gender}</td>
                          <td className="py-3 px-4">
                            <select
                              className="input-field !py-1 !text-xs !w-44"
                              value={studentStatuses[s._id] || 'Promoted'}
                              onChange={(e) => handleStatusChange(s._id, e.target.value)}
                            >
                              {PROMOTION_STATUSES.filter((st) => st !== 'Pending').map((statusOpt) => (
                                <option key={statusOpt} value={statusOpt}>
                                  {statusOpt}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-gray-500">
                          {t('attendance.noStudentsInClass')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={moving || selectedStudentIds.length === 0}
                onClick={handleMoveSelectedStudents}
                className="btn-primary flex items-center gap-2 px-6 py-2.5 font-bold shadow-md disabled:opacity-50"
              >
                <ArrowRight className="w-5 h-5" />
                {moving ? t('common.loading') : t('promotion.moveStudents')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('promotion.completeAcademicYear')}</h2>
        </div>
        <p className="text-xs text-gray-500">
          Mark all active classes and student enrollments for an academic year as Completed.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('students.academicYear')}:</label>
            <input
              className="input-field"
              value={academicYearToComplete}
              onChange={(e) => setAcademicYearToComplete(e.target.value)}
              placeholder="e.g. 2025-2026"
            />
          </div>
          <button type="button" onClick={handleCompleteYear} className="btn-secondary whitespace-nowrap">
            {t('promotion.completeAcademicYear')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Promotion;
