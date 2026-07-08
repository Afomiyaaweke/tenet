'use client';

import { useTheme } from 'next-themes';

interface TenetLogoProps {
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  className?: string;
}

export function TenetLogo({ size = 'md', iconOnly = false, className = '' }: TenetLogoProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const sizes = {
    sm: { icon: 24, text: 'text-sm' },
    md: { icon: 32, text: 'text-base' },
    lg: { icon: 40, text: 'text-xl' },
  };

  const s = sizes[size];
  const darkColor = isDark ? '#E2E8F0' : '#2C3E50';
  const lightColor = isDark ? '#94A3B8' : '#7F8C8D';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Network Hub Icon */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Central hexagon */}
        <path d="M20 8L28 13V23L20 28L12 23V13L20 8Z" fill="#334155" opacity="0.15" />
        <path d="M20 8L28 13V23L20 28L12 23V13L20 8Z" stroke="#475569" strokeWidth="1.5" fill="none" />

        {/* Checkmark inside */}
        <path d="M16 18L19 21L25 15" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Satellite nodes */}
        <circle cx="20" cy="5" r="2.5" fill="#475569" />
        <circle cx="30" cy="11" r="2" fill="#64748B" opacity="0.7" />
        <circle cx="30" cy="25" r="2" fill="#64748B" opacity="0.7" />
        <circle cx="20" cy="31" r="2.5" fill="#475569" />
        <circle cx="10" cy="25" r="2" fill="#64748B" opacity="0.7" />
        <circle cx="10" cy="11" r="2" fill="#64748B" opacity="0.7" />

        {/* Connection lines */}
        <line x1="20" y1="7.5" x2="20" y2="13" stroke="#94A3B8" strokeWidth="1" opacity="0.4" />
        <line x1="28.5" y1="11.5" x2="25" y2="13.5" stroke="#94A3B8" strokeWidth="1" opacity="0.4" />
        <line x1="28.5" y1="24.5" x2="25" y2="22.5" stroke="#94A3B8" strokeWidth="1" opacity="0.4" />
        <line x1="20" y1="28.5" x2="20" y2="23" stroke="#94A3B8" strokeWidth="1" opacity="0.4" />
        <line x1="11.5" y1="24.5" x2="15" y2="22.5" stroke="#94A3B8" strokeWidth="1" opacity="0.4" />
        <line x1="11.5" y1="11.5" x2="15" y2="13.5" stroke="#94A3B8" strokeWidth="1" opacity="0.4" />
      </svg>

      {/* Text - only show if not iconOnly */}
      {!iconOnly && (
        <span className={`${s.text} font-bold tracking-tight whitespace-nowrap`}>
          <span style={{ color: darkColor }}>Ten</span>
          <span style={{ color: lightColor }}>et</span>
        </span>
      )}
    </div>
  );
}
