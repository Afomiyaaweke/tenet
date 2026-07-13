'use client';

import Image from 'next/image';
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
  const accentColor = '#F97316';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Tenets Logo Image */}
      <Image
        src="/tenets-logo.png"
        alt="Tenets Logo"
        width={s.icon}
        height={s.icon}
        className="flex-shrink-0 rounded-sm object-cover"
        priority
      />

      {/* Text - only show if not iconOnly */}
      {!iconOnly && (
        <span className={`${s.text} font-bold tracking-tight whitespace-nowrap`}>
          <span style={{ color: darkColor }}>Ten</span>
          <span style={{ color: accentColor }}>ets</span>
        </span>
      )}
    </div>
  );
}
