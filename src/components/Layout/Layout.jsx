import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <Header onMenuClick={() => setMobileOpen(!mobileOpen)} sidebarCollapsed={collapsed} />
      <main className={`pt-16 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'} p-6 print:ml-0 print:p-0 print:pt-0 print:m-0`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
