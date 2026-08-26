import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const emptyForm = { name: '', gender: 'Male', phone: '', address: '', subject: '' };

const Teachers = () => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teachers', { params: { search, page, limit: 10 } });
      setTeachers(data.teachers);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeachers(); }, [search, page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/teachers/${editId}`, form);
        toast.success(t('teachers.teacherUpdated'));
      } else {
        await api.post('/teachers', form);
        toast.success(t('teachers.teacherCreated'));
      }
      setModalOpen(false);
      fetchTeachers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('teachers.deleteTeacherConfirm'))) return;
    try {
      await api.delete(`/teachers/${id}`);
      toast.success(t('teachers.teacherDeleted'));
      fetchTeachers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('teachers.title')}</h1>
        <button onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('teachers.addTeacher')}
        </button>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('teachers.searchTeachers')} />

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4">{t('common.id')}</th>
                <th className="text-left py-3 px-4">{t('common.name')}</th>
                <th className="text-left py-3 px-4">{t('teachers.subject')}</th>
                <th className="text-left py-3 px-4">{t('common.phone')}</th>
                <th className="text-left py-3 px-4">{t('students.account')}</th>
                <th className="text-right py-3 px-4">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacherItem) => (
                <tr key={teacherItem._id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-3 px-4 font-mono text-primary-600">{teacherItem.teacherId}</td>
                  <td className="py-3 px-4 font-medium">{teacherItem.name}</td>
                  <td className="py-3 px-4">{teacherItem.subject}</td>
                  <td className="py-3 px-4">{teacherItem.phone || '-'}</td>
                  <td className="py-3 px-4">{teacherItem.hasAccount ? <span className="text-green-500 text-xs">{t('common.active')}</span> : <span className="text-gray-400 text-xs">{t('common.none')}</span>}</td>
                  <td className="py-3 px-4 text-right flex justify-end gap-1">
                    <button onClick={() => { setEditId(teacherItem._id); setForm({ name: teacherItem.name, gender: teacherItem.gender, phone: teacherItem.phone || '', address: teacherItem.address || '', subject: teacherItem.subject }); setModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(teacherItem._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t('teachers.editTeacher') : t('teachers.addTeacher')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input-field" placeholder={t('students.fullName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="input-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="Male">{t('common.male')}</option>
            <option value="Female">{t('common.female')}</option>
            <option value="Other">{t('common.other')}</option>
          </select>
          <input className="input-field" placeholder={t('teachers.subject')} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          <input className="input-field" placeholder={t('common.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <textarea className="input-field" placeholder={t('common.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{editId ? t('common.update') : t('common.create')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Teachers;
