import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      // Try public endpoint first so it works even if not logged in
      const { data } = await api.get('/settings/public');
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refreshSettings = async () => {
    try {
      const { data } = await api.get('/settings/public');
      setSettings(data);
      return data;
    } catch (err) {
      console.error('Failed to refresh settings:', err);
    }
  };

  const updateSettingsInState = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const getLogoUrl = (logoPath) => {
    const path = logoPath || settings?.schoolLogo;
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    const rawApiUrl = (import.meta.env && import.meta.env.VITE_API_URL) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || '';
    const cleanApiUrl = rawApiUrl.replace(/\/$/, '');
    return cleanApiUrl ? `${cleanApiUrl}${path.startsWith('/') ? '' : '/'}${path}` : path;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSettings: updateSettingsInState,
        loading,
        refreshSettings,
        getLogoUrl,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
