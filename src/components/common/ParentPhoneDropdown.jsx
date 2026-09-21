import React, { useRef, useEffect } from 'react';

const ParentPhoneDropdown = ({ phone, studentId, openMenuId, setOpenMenuId }) => {
  const isOpen = openMenuId === studentId;
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (isOpen) {
          setOpenMenuId(null);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setOpenMenuId]);

  if (!phone || phone.trim() === '' || phone === 'N/A') {
    return <span className="text-gray-400 dark:text-gray-500 font-mono text-xs">N/A</span>;
  }

  const rawPhone = phone.trim();
  const whatsappNumber = rawPhone.replace(/\D/g, '');

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setOpenMenuId(isOpen ? null : studentId);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="font-mono text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline focus:outline-none transition-colors"
      >
        {rawPhone}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <a
            href={`tel:${rawPhone}`}
            onClick={() => setOpenMenuId(null)}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 dark:hover:text-purple-300 font-medium transition-colors"
          >
            <span>📞</span> Call
          </a>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpenMenuId(null)}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
          >
            <span>💬</span> WhatsApp
          </a>
          <a
            href={`sms:${rawPhone}`}
            onClick={() => setOpenMenuId(null)}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
          >
            <span>💬</span> SMS
          </a>
        </div>
      )}
    </div>
  );
};

export default ParentPhoneDropdown;
