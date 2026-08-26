import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-600">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">{t('notFound.title')}</p>
        <p className="text-sm text-gray-500 mt-1">{t('notFound.message')}</p>
        <Link to="/login" className="btn-primary inline-block mt-6">{t('notFound.goBack')}</Link>
      </div>
    </div>
  );
};

export default NotFound;
