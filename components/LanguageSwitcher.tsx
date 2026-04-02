'use client';

import { useTranslation } from '@/lib/i18n';
import type { Lang } from '@/lib/translations';

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'pap', label: 'PAP', flag: '🇨🇼' },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-full p-0.5">
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
            lang === l.code
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          title={l.label}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
