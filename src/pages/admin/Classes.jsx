import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Users, FileText, BarChart2, CalendarCheck, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Classes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ className: '', gradeLevel: '', category: '', academicYear: '2026', classTeacher: '', status: 'Active' });

  // Class View Modal States
  const [viewClassModal, setViewClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

  const [studentsModal, setStudentsModal] = useState(false);
  const [classStudentsData, setClassStudentsData] = useState(null);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, t, categoryResponse] = await Promise.all([
        api.get('/classes', { params: { search, page, limit: 10 } }),
        api.get('/teachers', { params: { limit: 100 } }),
        api.get('/categories'),
      ]);
      setClasses(c.data.classes);
      setPages(c.data.pages);
      setTeachers(t.data.teachers);
      setCategories(categoryResponse.data.categories);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/classes/${editId}`, form);
        toast.success(t('classes.classUpdated'));
      } else {
        await api.post('/classes', form);
        toast.success(t('classes.classCreated'));
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleCompleteClass = async (cls) => {
    if (!confirm(t('classes.completeClassConfirm', { className: cls.className }))) return;
    try {
      const { data } = await api.put(`/classes/${cls._id}/complete`);
      toast.success(data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete class');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('classes.deleteClassConfirm'))) return;
    try {
      await api.delete(`/classes/${id}`);
      toast.success(t('classes.classDeleted'));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const openViewClass = (cls) => {
    setSelectedClass(cls);
    setViewClassModal(true);
  };

  const openViewStudents = async (cls) => {
    setSelectedClass(cls);
    setStudentsLoading(true);
    setStudentsModal(true);
    try {
      const { data } = await api.get(`/classes/${cls._id}/students`);
      setClassStudentsData(data);
    } catch (err) {
      toast.error('Failed to load class students');
    } finally {
      setStudentsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('classes.title')}</h1>
          <p className="text-sm text-gray-500">Manage active and historical completed classes.</p>
        </div>
        <button onClick={() => { setEditId(null); setForm({ className: '', gradeLevel: '', category: '', academicYear: '2026', classTeacher: '', status: 'Active' }); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('classes.addClass')}
        </button>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('classes.searchClasses')} />

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto p-0 border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3 px-4">{t('classes.className')}</th>
                <th className="py-3 px-4">{t('classes.gradeLevel')}</th>
                <th className="py-3 px-4">{t('classes.category')}</th>
                <th className="py-3 px-4">{t('classes.academicYear')}</th>
                <th className="py-3 px-4">{t('classes.classTeacher')}</th>
                <th className="py-3 px-4">{t('classes.students')}</th>
                <th className="py-3 px-4">{t('common.status')}</th>
                <th className="py-3 px-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {classes.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{c.className}</td>
                  <td className="py-3 px-4">{c.gradeLevel}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{c.category?.name || '-'}</td>
                  <td className="py-3 px-4 font-medium text-primary-600">{c.academicYear}</td>
                  <td className="py-3 px-4">{c.classTeacher?.name || '-'}</td>
                  <td className="py-3 px-4 font-semibold">{c.studentCount ?? 0}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {c.status === 'Active' ? t('common.active') : c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <button onClick={() => openViewClass(c)} title={t('classes.viewClass')} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openViewStudents(c)} title={t('classes.viewStudents')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <Users className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate(`/admin/exams?classId=${c._id}`)} title={t('navigation.exams')} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate(`/exam-results/view?classId=${c._id}`)} title={t('navigation.viewExamResults')} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded">
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate(`/admin/attendance?classId=${c._id}`)} title={t('navigation.attendance')} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded">
                        <CalendarCheck className="w-4 h-4" />
                      </button>
                      {c.status === 'Active' && (
                        <>
                          <button onClick={() => navigate(`/admin/promotion?fromClassId=${c._id}`)} title={t('promotion.moveToNextClass')} className="px-2 py-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded text-xs font-medium hover:bg-amber-100 flex items-center gap-1">
                            <ArrowRight className="w-3.5 h-3.5" /> {t('promotion.moveStudents')}
                          </button>
                          <button onClick={() => handleCompleteClass(c)} title={t('classes.completeClass')} className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded text-xs font-medium hover:bg-emerald-100 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> {t('classes.completeClass')}
                          </button>
                        </>
                      )}
                      <button onClick={() => { setEditId(c._id); setForm({ className: c.className, gradeLevel: c.gradeLevel, category: c.category?._id || '', academicYear: c.academicYear, classTeacher: c.classTeacher?._id || '', status: c.status }); setModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      )}

      {/* VIEW CLASS DETAILS MODAL */}
      <Modal isOpen={viewClassModal} onClose={() => setViewClassModal(false)} title={t('classes.viewClass')}>
        {selectedClass && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div><p className="text-xs text-gray-500">{t('classes.className')}</p><p className="font-semibold">{selectedClass.className}</p></div>
              <div><p className="text-xs text-gray-500">{t('classes.gradeLevel')}</p><p className="font-semibold">{selectedClass.gradeLevel}</p></div>
              <div><p className="text-xs text-gray-500">{t('classes.academicYear')}</p><p className="font-semibold text-primary-600">{selectedClass.academicYear}</p></div>
              <div><p className="text-xs text-gray-500">{t('classes.category')}</p><p>{selectedClass.category?.name || '-'}</p></div>
              <div><p className="text-xs text-gray-500">{t('classes.classTeacher')}</p><p>{selectedClass.classTeacher?.name || '-'}</p></div>
              <div><p className="text-xs text-gray-500">{t('common.status')}</p><p className="font-semibold">{selectedClass.status}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-700 justify-end">
              <button onClick={() => { setViewClassModal(false); navigate(`/admin/promotion?fromClassId=${selectedClass._id}`); }} className="btn-secondary text-xs flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" /> {t('promotion.moveStudents')}
              </button>
              <button onClick={() => setViewClassModal(false)} className="btn-primary text-xs">{t('common.close')}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* VIEW ENROLLED STUDENTS MODAL */}
      <Modal isOpen={studentsModal} onClose={() => setStudentsModal(false)} title={`${t('classes.students')} (${selectedClass?.className || ''})`} size="lg">
        {studentsLoading || !classStudentsData ? <LoadingSpinner /> : (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{t('students.class')}: <strong>{selectedClass?.className}</strong> ({selectedClass?.academicYear})</span>
              <span>{t('dashboard.totalStudents')}: <strong>{classStudentsData.totalStudents}</strong></span>
            </div>
            <div className="overflow-x-auto max-h-72 border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">{t('students.studentId')}</th>
                    <th className="py-2.5 px-3">{t('common.name')}</th>
                    <th className="py-2.5 px-3">{t('common.gender')}</th>
                    <th className="py-2.5 px-3">{t('students.promotionStatus')}</th>
                    <th className="py-2.5 px-3">{t('students.enrollmentStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {classStudentsData.enrollments.map((e) => (
                    <tr key={e._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="py-2 px-3 font-mono text-primary-600 font-medium">{e.studentId?.studentId || '-'}</td>
                      <td className="py-2 px-3 font-medium">{e.studentId?.name || 'Unknown'}</td>
                      <td className="py-2 px-3">{e.studentId?.gender || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          e.promotionStatus === 'Promoted' ? 'bg-green-100 text-green-700' :
                          e.promotionStatus === 'Repeating' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {e.promotionStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${e.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {classStudentsData.enrollments.length === 0 && classStudentsData.currentStudents.map((s) => (
                    <tr key={s._id}>
                      <td className="py-2 px-3 font-mono text-primary-600">{s.studentId}</td>
                      <td className="py-2 px-3 font-medium">{s.name}</td>
                      <td className="py-2 px-3">{s.gender}</td>
                      <td className="py-2 px-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{t('common.active')}</span></td>
                      <td className="py-2 px-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px]">{t('common.active')}</span></td>
                    </tr>
                  ))}
                  {classStudentsData.totalStudents === 0 && (
                    <tr><td colSpan={5} className="text-center py-4 text-gray-500">{t('attendance.noStudentsInClass')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setStudentsModal(false)} className="btn-secondary">{t('common.close')}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT CLASS MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t('classes.editClass') : t('classes.addClass')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input-field" placeholder={t('classes.className')} value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} required />
          <select className="input-field" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} required>
            <option value="">{t('classes.gradeLevel')}</option>
            {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
            <option value="">{t('classes.category')}</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name} ({category.academicType})</option>)}
          </select>
          <input className="input-field" placeholder={t('classes.academicYear')} value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required />
          <select className="input-field" value={form.classTeacher} onChange={(e) => setForm({ ...form, classTeacher: e.target.value })}>
            <option value="">{t('classes.classTeacher')}</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="Active">{t('common.active')}</option><option value="Completed">Completed</option>
          </select>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{editId ? t('common.update') : t('common.create')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Classes;
