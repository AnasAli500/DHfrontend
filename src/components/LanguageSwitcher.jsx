import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', nativeLabel: 'English' },
  { code: 'so', label: 'Somali', flag: '🇸🇴', nativeLabel: 'Somali' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦', nativeLabel: 'العربية' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
        aria-haspopup="listbox"
        aria-expanded={open}
        id="language-switcher-btn"
      >
        <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="hidden sm:inline">{currentLang.nativeLabel}</span>
        <span className="sm:hidden">{currentLang.flag}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 min-w-[160px] overflow-hidden"
          style={{
            // For RTL, open dropdown to the left; for LTR, open to the right
            right: document.documentElement.dir === 'rtl' ? 'auto' : '0',
            left: document.documentElement.dir === 'rtl' ? '0' : 'auto',
          }}
          role="listbox"
          aria-labelledby="language-switcher-btn"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                lang.code === i18n.language
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              role="option"
              aria-selected={lang.code === i18n.language}
              id={`lang-option-${lang.code}`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="flex-1 text-start">{lang.nativeLabel}</span>
              {lang.code === i18n.language && (
                <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
