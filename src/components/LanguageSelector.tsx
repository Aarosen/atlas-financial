import { useState, useRef, useEffect } from 'react';
import type { SupportedLanguage } from '@/lib/ai/slangMapper';
import { ChevronDown } from 'lucide-react';

const languages: Array<{ code: SupportedLanguage; name: string; flag: string }> = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export function LanguageSelector({
  currentLanguage,
  onLanguageChange,
}: {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const currentLang = languages.find((l) => l.code === currentLanguage);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: 100,
          border: '1px solid var(--bdr)',
          background: 'var(--bg2)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ink)',
          transition: 'all 0.2s ease',
        }}
        aria-label="Language selector"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {currentLang?.flag} {currentLang?.name}
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            zIndex: 50,
            background: 'var(--card)',
            border: '1px solid var(--bdr2)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: 'var(--sh3)',
            minWidth: 160,
          }}
          role="listbox"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code);
                setOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                background: currentLanguage === lang.code ? 'var(--teal-lt)' : 'none',
                color: currentLanguage === lang.code ? 'var(--teal)' : 'var(--ink)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: currentLanguage === lang.code ? 700 : 400,
                transition: 'background 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (currentLanguage !== lang.code) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg2)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentLanguage !== lang.code) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'none';
                }
              }}
              role="option"
              aria-selected={currentLanguage === lang.code}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
