import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Periods = () => {
  const { t } = useTranslation();
  const [periods, setPeriods] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ periodName: '', subject: '', teacherId: '', classId: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, tData, c] = await Promise.all([
        api.get('/periods', { params: { search, page, limit: 10 } }),
        api.get('/teachers', { params: { limit: 100 } }),
        api.get('/classes', { params: { limit: 100 } }),
      ]);
      setPeriods(p.data.periods);
      setPages(p.data.pages);
      setTeachers(tData.data.teachers);
      setClasses(c.data.classes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/periods/${editId}`, form);
        toast.success(t('periods.periodUpdated'));
      } else {
        await api.post('/periods', form);
        toast.success(t('periods.periodCreated'));
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this period?')) return;
    try {
      await api.delete(`/periods/${id}`);
      toast.success(t('periods.periodDeleted'));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('periods.title')}</h1>
        <button onClick={() => { setEditId(null); setForm({ periodName: '', subject: '', teacherId: '', classId: '' }); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('periods.addPeriod')}
        </button>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search periods..." />

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4">{t('periods.title')}</th>
                <th className="text-left py-3 px-4">{t('teachers.subject')}</th>
                <th className="text-left py-3 px-4">{t('students.teacher')}</th>
                <th className="text-left py-3 px-4">{t('students.class')}</th>
                <th className="text-right py-3 px-4">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-3 px-4 font-medium">{p.periodName}</td>
                  <td className="py-3 px-4">{p.subject}</td>
                  <td className="py-3 px-4">{p.teacherId?.name || '-'}</td>
                  <td className="py-3 px-4">{p.classId?.className || '-'}</td>
                  <td className="py-3 px-4 text-right flex justify-end gap-1">
                    <button onClick={() => { setEditId(p._id); setForm({ periodName: p.periodName, subject: p.subject, teacherId: p.teacherId?._id || '', classId: p.classId?._id || '' }); setModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t('periods.editPeriod') : t('periods.addPeriod')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input-field" placeholder="Period Name" value={form.periodName} onChange={(e) => setForm({ ...form, periodName: e.target.value })} required />
          <input className="input-field" placeholder={t('teachers.subject')} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          <select className="input-field" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required>
            <option value="">{t('attendance.selectTeacher')}</option>
            {teachers.map((tItem) => <option key={tItem._id} value={tItem._id}>{tItem.name} - {tItem.subject}</option>)}
          </select>
          <select className="input-field" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
            <option value="">{t('classes.selectClass')}</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.className}</option>)}
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

export default Periods;
