import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      setProfile(data);
      setForm({ name: data.name, phone: data.phone || '', address: data.address || '' });
    }).finally(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/profile', form);
      setProfile(data);
      toast.success(t('profile.profileUpdated'));
    } catch {
      toast.error(t('profile.profileFailed'));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) return toast.error(t('profile.passwordMinLength'));
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error(t('profile.passwordsDoNotMatch'));
    try {
      await api.put('/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(t('profile.passwordChanged'));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.passwordFailed'));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const { data } = await api.post('/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile({ ...profile, avatar: data.avatar });
      toast.success(t('profile.avatarUpdated'));
    } catch {
      toast.error(t('profile.avatarFailed'));
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      <div className="card">
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center overflow-hidden">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary-600">{user?.name?.charAt(0)}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer text-white text-xs">
              +
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.name}</h2>
            <p className="text-gray-500">{profile?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-600 capitalize">
              {profile?.role === 'admin' ? t('users.admin') : profile?.role === 'teacher' ? t('users.teacher') : profile?.role === 'student' ? t('users.student') : profile?.role}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {['profile', 'password'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 capitalize ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-600 font-medium' : 'text-gray-500'}`}>
              {tab === 'profile' ? t('profile.editProfile') : t('profile.changePassword')}
            </button>
          ))}
        </div>

        {activeTab === 'profile' ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('students.fullName')}</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('common.phone')}</label>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('common.address')}</label>
              <textarea className="input-field" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary">{t('attendance.saveChanges')}</button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <input type="password" className="input-field" placeholder={t('profile.currentPassword')} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
            <input type="password" className="input-field" placeholder={t('profile.newPassword')} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} minLength={8} required />
            <input type="password" className="input-field" placeholder={t('profile.confirmPassword')} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
            <button type="submit" className="btn-primary">{t('profile.changePassword')}</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
