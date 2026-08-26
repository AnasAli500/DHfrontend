const LoadingSpinner = ({ fullScreen = false }) => {
  const wrapper = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 z-50'
    : 'flex items-center justify-center p-8';

  return (
    <div className={wrapper}>
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
};

export default LoadingSpinner;
