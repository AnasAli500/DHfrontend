import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Users = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [accountType, setAccountType] = useState('admin');
  const [form, setForm] = useState({ name: '', email: '', password: '', studentId: '', teacherId: '', role: 'admin' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { search, page, limit: 10 } });
      setUsers(data.users);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search, page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      let endpoint = '/users/admin';
      let payload = { name: form.name, email: form.email, password: form.password, role: form.role };

      if (accountType === 'student') {
        endpoint = '/users/student';
        payload = { studentId: form.studentId, email: form.email, password: form.password };
      } else if (accountType === 'teacher') {
        endpoint = '/users/teacher';
        payload = { teacherId: form.teacherId, email: form.email, password: form.password };
      }

      const { data } = await api.post(endpoint, payload);
      toast.success(data.message || t('users.userCreated'));
      setModalOpen(false);
      setForm({ name: '', email: '', password: '', studentId: '', teacherId: '', role: 'admin' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('users.deleteUserConfirm'))) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success(t('users.userDeleted'));
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('users.title')}</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('users.addUser')}
        </button>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('users.searchUsers')} />

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4">{t('common.name')}</th>
                <th className="text-left py-3 px-4">{t('auth.email')}</th>
                <th className="text-left py-3 px-4">{t('users.role')}</th>
                <th className="text-left py-3 px-4">{t('common.id')}</th>
                <th className="text-right py-3 px-4">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-3 px-4 font-medium">{u.name}</td>
                  <td className="py-3 px-4">{u.email}</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded-full text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 capitalize">{u.role === 'admin' ? t('users.admin') : u.role === 'teacher' ? t('users.teacher') : u.role === 'student' ? t('users.student') : u.role}</span></td>
                  <td className="py-3 px-4 text-gray-500">{u.studentId || u.teacherId || '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => handleDelete(u._id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('users.addUser')}>
        <div className="flex gap-2 mb-4">
          {['admin', 'student', 'teacher'].map((roleType) => (
            <button key={roleType} onClick={() => setAccountType(roleType)} className={`px-4 py-2 rounded-lg capitalize ${accountType === roleType ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
              {roleType === 'admin' ? t('users.admin') : roleType === 'student' ? t('users.student') : t('users.teacher')}
            </button>
          ))}
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          {accountType === 'admin' && (
            <>
              <input className="input-field" placeholder={t('students.fullName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">{t('users.admin')}</option>
              </select>
            </>
          )}
          {accountType === 'student' && (
            <input className="input-field" placeholder={t('students.studentId')} value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
          )}
          {accountType === 'teacher' && (
            <input className="input-field" placeholder={t('teachers.teacherId')} value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required />
          )}
          <input type="email" className="input-field" placeholder={t('auth.email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" className="input-field" placeholder={t('auth.password')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('users.addUser')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
