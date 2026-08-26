import { useEffect, useState, useRef } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { Upload, Trash2, GraduationCap, Image as ImageIcon } from 'lucide-react';

const Settings = () => {
  const { t } = useTranslation();
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => setSettings(data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/settings', settings);
      setSettings(data);
      await refreshSettings();
      toast.success(t('settings.settingsSaved'));
    } catch {
      toast.error(t('settings.settingsFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
    if (!isImage) {
      toast.error('Only image files (JPG, PNG, WEBP, SVG, GIF) are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogo(true);
    try {
      const { data } = await api.post('/settings/logo', formData, {
        headers: { 'Content-Type': undefined },
      });
      setSettings(data);
      await refreshSettings();
      toast.success(t('settings.logoUploaded'));
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error(err.response?.data?.message || t('settings.logoFailed'));
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Are you sure you want to remove the school logo?')) return;
    setUploadingLogo(true);
    try {
      const { data } = await api.delete('/settings/logo');
      setSettings(data);
      await refreshSettings();
      toast.success(t('settings.logoRemoved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.logoRemoveFailed'));
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>

      {/* School Logo Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary-600" />
          {t('settings.schoolLogo')}
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
            {settings?.schoolLogo ? (
              <img
                src={settings.schoolLogo}
                alt="School Logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="text-center p-2 text-gray-400">
                <GraduationCap className="w-10 h-10 mx-auto text-primary-500" />
                <span className="text-[10px] block mt-1 font-medium">No Logo</span>
              </div>
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {settings?.schoolLogo ? t('settings.changeLogo') : t('settings.uploadLogo')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Allowed formats: PNG, JPG, WEBP, SVG (Max size: 5MB).
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="school-logo-input"
              />
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
              >
                <Upload className="w-4 h-4" />
                {settings?.schoolLogo ? t('settings.changeLogo') : t('settings.uploadLogo')}
              </button>

              {settings?.schoolLogo && (
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={handleRemoveLogo}
                  className="px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('settings.removeLogo')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('settings.schoolSettings')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('settings.schoolName')}</label>
              <input
                className="input-field"
                placeholder={t('settings.schoolName')}
                value={settings?.schoolName || ''}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('settings.schoolEmail')}</label>
              <input
                className="input-field"
                placeholder={t('settings.schoolEmail')}
                value={settings?.schoolEmail || ''}
                onChange={(e) => setSettings({ ...settings, schoolEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('settings.schoolPhone')}</label>
              <input
                className="input-field"
                placeholder={t('settings.schoolPhone')}
                value={settings?.schoolPhone || ''}
                onChange={(e) => setSettings({ ...settings, schoolPhone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('settings.schoolAddress')}</label>
              <input
                className="input-field"
                placeholder={t('settings.schoolAddress')}
                value={settings?.schoolAddress || ''}
                onChange={(e) => setSettings({ ...settings, schoolAddress: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('settings.notificationSettings')}</h3>
          <div className="space-y-3">
            {[
              { key: 'emailNotifications', label: t('settings.emailNotifications') },
              { key: 'attendanceNotifications', label: t('settings.attendanceNotifications') },
              { key: 'examNotifications', label: t('settings.examNotifications') },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!settings?.[key]}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary py-2.5 px-6">
          {saving ? t('common.saving') : t('settings.saveSettings')}
        </button>
      </form>
    </div>
  );
};

export default Settings;

