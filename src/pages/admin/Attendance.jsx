import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Save, Info, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const STATUS_STYLES = {
  Present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Late: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const STATUS_OPTIONS = ['Present', 'Absent', 'Late'];

const StatusRadio = ({ name, value, status, color, onChange, label }) => (
  <label className="inline-flex items-center gap-1.5 cursor-pointer">
    <input
      type="radio"
      name={name}
      value={status}
      checked={value === status}
      onChange={() => onChange(status)}
      className={`w-4 h-4 accent-${color}-500`}
    />
    <span className={`text-sm font-medium ${
      status === 'Present' ? 'text-green-600' : status === 'Absent' ? 'text-red-600' : 'text-orange-600'
    }`}>{label || status}</span>
  </label>
);

const AttendancePage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const today = new Date().toISOString().split('T')[0];

  const [view, setView] = useState('list');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [sheetStudents, setSheetStudents] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);

  const [filterDate, setFilterDate] = useState('');
  const [filterClass, setFilterClass] = useState(initialClassId);

  const [recordForm, setRecordForm] = useState({ classId: '', teacherId: '', date: today });
  const [editModal, setEditModal] = useState({ open: false, record: null, status: 'Present' });

  const getStatusLabel = (status) => {
    if (status === 'Present') return t('students.present');
    if (status === 'Absent') return t('students.absent');
    if (status === 'Late') return t('students.late');
    return status;
  };

  const fetchClasses = useCallback(async () => {
    const { data } = await api.get('/classes', { params: { limit: 100 } });
    setClasses(data.classes);
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterDate) params.date = filterDate;
      if (filterClass) params.classId = filterClass;
      const { data } = await api.get('/attendance', { params });
      setAttendance(data.attendance);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }, [page, filterDate, filterClass]);

  const fetchTeachersForClass = useCallback(async (classId) => {
    if (!classId) { setTeachers([]); return; }
    const { data } = await api.get(`/attendance/teachers/${classId}`);
    setTeachers(data.teachers);
    if (data.teachers.length === 1) {
      setRecordForm((f) => ({ ...f, teacherId: data.teachers[0]._id }));
    }
  }, []);

  const fetchSheet = useCallback(async () => {
    const { classId, teacherId, date } = recordForm;
    if (!classId || !teacherId || !date) { setSheetStudents([]); return; }

    setSheetLoading(true);
    try {
      const { data } = await api.get('/attendance/sheet', { params: { classId, teacherId, date } });
      setSheetStudents(data.students);
    } catch (err) {
      toast.error(err.response?.data?.message || t('attendance.failedToLoadStudents'));
      setSheetStudents([]);
    } finally {
      setSheetLoading(false);
    }
  }, [recordForm, t]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  useEffect(() => {
    if (view === 'list') fetchAttendance();
  }, [view, fetchAttendance]);

  useEffect(() => {
    if (view === 'record' && recordForm.classId) {
      fetchTeachersForClass(recordForm.classId);
    }
  }, [view, recordForm.classId, fetchTeachersForClass]);

  useEffect(() => {
    if (view === 'record' && recordForm.classId && recordForm.teacherId && recordForm.date) {
      fetchSheet();
    }
  }, [view, recordForm, fetchSheet]);

  const openRecordView = () => {
    setRecordForm({ classId: filterClass || '', teacherId: '', date: filterDate || today });
    setSheetStudents([]);
    setView('record');
  };

  const handleSaveBulk = async () => {
    const { classId, teacherId, date } = recordForm;
    if (!classId || !teacherId || !date) {
      toast.error(t('attendance.pleaseSelectClassTeacherDate'));
      return;
    }
    if (!sheetStudents.length) {
      toast.error(t('attendance.noStudentsFound'));
      return;
    }

    setSaving(true);
    try {
      await api.post('/attendance/bulk', {
        classId,
        teacherId,
        date,
        records: sheetStudents.map((s) => ({ studentId: s._id, status: s.status })),
      });
      toast.success(t('attendance.attendanceSaved'));
      setView('list');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || t('attendance.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/attendance/${editModal.record._id}`, { status: editModal.status });
      toast.success(t('attendance.attendanceUpdated'));
      setEditModal({ open: false, record: null, status: 'Present' });
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('attendance.deleteRecordConfirm'))) return;
    try {
      await api.delete(`/attendance/${id}`);
      toast.success(t('attendance.recordDeleted'));
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const updateStudentStatus = (studentId, status) => {
    setSheetStudents((prev) => prev.map((s) => (s._id === studentId ? { ...s, status } : s)));
  };

  if (view === 'record') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('attendance.title')}</h1>

        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('students.class')} <span className="text-red-500">*</span></label>
              <select
                className="input-field"
                value={recordForm.classId}
                onChange={(e) => setRecordForm({ classId: e.target.value, teacherId: '', date: recordForm.date })}
              >
                <option value="">{t('attendance.selectClass')}</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.className}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('students.teacher')} <span className="text-red-500">*</span></label>
              <select
                className="input-field"
                value={recordForm.teacherId}
                onChange={(e) => setRecordForm({ ...recordForm, teacherId: e.target.value })}
                disabled={!recordForm.classId}
              >
                <option value="">{t('attendance.selectTeacher')}</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('common.date')} <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="input-field"
                value={recordForm.date}
                onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('attendance.teachersAssigned')}
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">{t('students.title')}</h3>

          {sheetLoading ? (
            <LoadingSpinner />
          ) : !recordForm.classId || !recordForm.teacherId ? (
            <p className="text-gray-500 text-center py-8">{t('attendance.selectClassAndTeacher')}</p>
          ) : sheetStudents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('attendance.noStudentsInClass')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 w-12">#</th>
                    <th className="text-left py-3 px-4">{t('students.studentId')}</th>
                    <th className="text-left py-3 px-4">{t('students.fullName')}</th>
                    <th className="text-left py-3 px-4">{t('navigation.attendance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetStudents.map((s, i) => (
                    <tr key={s._id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-4 px-4 text-gray-500">{i + 1}</td>
                      <td className="py-4 px-4 font-mono text-primary-600">{s.studentId}</td>
                      <td className="py-4 px-4 font-medium">{s.name}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-4">
                          {STATUS_OPTIONS.map((status) => (
                            <StatusRadio
                              key={status}
                              name={`student-${s._id}`}
                              value={s.status}
                              status={status}
                              label={getStatusLabel(status)}
                              color={status === 'Present' ? 'green' : status === 'Absent' ? 'red' : 'orange'}
                              onChange={(val) => updateStudentStatus(s._id, val)}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button onClick={() => setView('list')} className="btn-secondary px-6">{t('common.cancel')}</button>
          <button
            onClick={handleSaveBulk}
            disabled={saving || !sheetStudents.length}
            className="btn-primary flex items-center gap-2 px-6"
          >
            <Save className="w-4 h-4" />
            {saving ? t('attendance.savingAttendance') : t('attendance.saveAttendance')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('attendance.title')}</h1>
        <button onClick={openRecordView} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('attendance.recordAttendance')}
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                className="input-field pl-10"
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                placeholder="mm/dd/yyyy"
              />
            </div>
          </div>
          <div className="flex-1">
            <select
              className="input-field"
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}
            >
              <option value="">{t('attendance.allClasses')}</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.className}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-wide">{t('attendance.student')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-wide">{t('students.class')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-wide">{t('students.teacher')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-wide">{t('common.date')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-wide">{t('common.status')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-wide">{t('attendance.recordedBy')}</th>
                {(isAdmin || user?.role === 'teacher') && (
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-wide">{t('common.actions')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-gray-500">
                    {t('attendance.noRecordsFound')}
                  </td>
                </tr>
              ) : attendance.map((a) => (
                <tr key={a._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                  <td className="py-3 px-4 font-medium">{a.studentId?.name}</td>
                  <td className="py-3 px-4">{a.classId?.className}</td>
                  <td className="py-3 px-4">{a.teacherId?.name || '-'}</td>
                  <td className="py-3 px-4">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                      {getStatusLabel(a.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{a.recordedBy?.name || '-'}</td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditModal({ open: true, record: a, status: a.status })}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(a._id)}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  )}
                  {!isAdmin && user?.role === 'teacher' && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setEditModal({ open: true, record: a, status: a.status })}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('common.edit')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4">
            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, record: null, status: 'Present' })}
        title={t('attendance.editAttendance')}
      >
        {editModal.record && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {t('attendance.student')}: <span className="font-medium text-gray-900 dark:text-gray-100">{editModal.record.studentId?.name}</span>
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">{t('common.status')}</label>
              <div className="flex gap-4">
                {STATUS_OPTIONS.map((status) => (
                  <StatusRadio
                    key={status}
                    name="edit-status"
                    value={editModal.status}
                    status={status}
                    label={getStatusLabel(status)}
                    color={status === 'Present' ? 'green' : status === 'Absent' ? 'red' : 'orange'}
                    onChange={(val) => setEditModal({ ...editModal, status: val })}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditModal({ open: false, record: null, status: 'Present' })} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={handleEdit} className="btn-primary">{t('attendance.saveChanges')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AttendancePage;
