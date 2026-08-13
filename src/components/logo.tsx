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
  const accentColor = '#F97316';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* TenetBid Logo - using SVG icon for reliability */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect width="32" height="32" rx="6" fill={accentColor} />
        <text
          x="16"
          y="22"
          textAnchor="middle"
          fill="white"
          fontSize="18"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          T
        </text>
      </svg>

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
